import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { MqttMessageLogsService } from '../modules/MqttMessageLogs/MqttMessageLogs.service';
import { DeviceStatusSnapshotsService } from '../modules/DeviceStatusSnapshots/DeviceStatusSnapshots.service';
import { DeviceCommandsService } from '../modules/DeviceCommands/DeviceCommands.service';
import { CryptoService } from '../common/crypto.service';
import {
  MqttTopicType,
  MqttDirection,
  DeviceCommandType,
  DeviceSubsystem,
} from '../common/enums';
import { EnergyReadingsDetailedService } from '../modules/EnergyReadingsDetailed/EnergyReadingsDetailed.service';
import {
  SensorData,
  DeviceStatus,
  DeviceCommandPayload,
} from '../common/interfaces';
import { SmartMetersService } from 'src/modules/SmartMeters/SmartMeters.service';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;
  private readonly topics = {
    sensors: 'home/energy-monitor/sensors',
    status: 'home/energy-monitor/status',
    command: 'home/energy-monitor/command',
  };

  constructor(
    private configService: ConfigService,
    private mqttMessageLogsService: MqttMessageLogsService,
    private EnergyReadingsDetailedService: EnergyReadingsDetailedService,
    private deviceStatusSnapshotsService: DeviceStatusSnapshotsService,
    private deviceCommandsService: DeviceCommandsService,
    private cryptoService: CryptoService,
    private smartMetersService: SmartMetersService,
  ) {}

  onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  private connect() {
    const brokerUrl =
      (this.configService.get<string>('MQTT_BROKER_URL') as string) ||
      'mqtt://localhost:1883';
    const clientId =
      (this.configService.get<string>('MQTT_CLIENT_ID') as string) ||
      'enerlink-backend';

    this.client = mqtt.connect(brokerUrl, {
      clientId: clientId,
      clean: true,
      keepalive: 60,
      username: this.configService.get<string>('MQTT_USERNAME') as string,
      password: this.configService.get<string>('MQTT_PASSWORD') as string,
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to MQTT broker');
      this.subscribeToTopics();
    });

    this.client.on('message', (topic, message) => {
      void this.handleMessage(topic, message);
    });

    this.client.on('error', (error) => {
      this.logger.error('MQTT connection error:', error);
    });

    this.client.on('close', () => {
      this.logger.warn('MQTT connection closed');
    });
  }

  private subscribeToTopics() {
    const topicsToSubscribe = [this.topics.sensors, this.topics.status];

    topicsToSubscribe.forEach((topic) => {
      this.client.subscribe(topic, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          this.logger.log(`Subscribed to ${topic}`);
        }
      });
    });
  }

  private async updateLastSeen(meterId: string) {
    try {
      // Update last seen timestamp for the meter
      await this.smartMetersService.updateLastSeen(meterId);
    } catch (error) {
      this.logger.error(
        `Failed to update last seen for meter ${meterId}:`,
        error,
      );
    }
  }

  private async handleMessage(topic: string, message: Buffer) {
    try {
      const payload = message.toString();
      const parsedPayload: unknown = JSON.parse(payload);

      // Validate that parsedPayload is an object
      if (typeof parsedPayload !== 'object' || parsedPayload === null) {
        throw new Error('Invalid JSON payload: not an object');
      }

      // Extract meter ID from topic or payload
      const meterId = this.extractMeterId(topic, parsedPayload);
      // const meterId = 'METER001';
      // Log message
      await this.logMessage(topic, payload, meterId, MqttDirection.INBOUND);

      // Update last seen timestamp for the meter
      await this.updateLastSeen(meterId);

      // Process based on topic type
      if (topic.includes('sensors')) {
        // this.logger.log(parsedPayload);
        await this.processSensorData(meterId, parsedPayload as SensorData);
      } else if (topic.includes('status')) {
        await this.processStatus(meterId, parsedPayload as DeviceStatus);
      }
    } catch (error) {
      this.logger.error('Error processing MQTT message:', error);
      // Log error message
      await this.logMessage(
        topic,
        message.toString(),
        null,
        MqttDirection.INBOUND,
        'FAILED',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private extractMeterId(topic: string, payload: any): string {
    // Try to extract meter ID from payload first
    if (
      payload &&
      typeof payload === 'object' &&
      ('meterId' in payload || 'meter_id' in payload)
    ) {
      const meterId =
        (payload as { meterId?: unknown; meter_id?: unknown }).meterId ||
        (payload as { meterId?: unknown; meter_id?: unknown }).meter_id;
      if (typeof meterId === 'string') {
        return meterId;
      }
    }

    // Extract from topic structure if available
    const topicParts = topic.split('/');
    if (topicParts.length > 3) {
      return topicParts[3]; // Assuming format: home/energy-monitor/{meterId}/sensors
    }

    // Default meter ID if not found
    return 'default-meter';
  }

  private async processSensorData(meterId: string, data: SensorData) {
    try {
      // Store detailed energy readings for all subsystems
      const subsystemMappings = [
        {
          subsystem: DeviceSubsystem.SOLAR,
          data: data.solar,
          extraData: { generating: data.solar.generating },
        },
        {
          subsystem: DeviceSubsystem.LOAD,
          data: data.load,
          extraData: {},
        },
        {
          subsystem: DeviceSubsystem.BATTERY,
          data: data.battery,
          extraData: { state: data.battery.state },
        },
        {
          subsystem: DeviceSubsystem.GRID_IMPORT,
          data: data.import,
          extraData: { active: data.import.active },
        },
        {
          subsystem: DeviceSubsystem.GRID_EXPORT,
          data: data.export,
          extraData: { active: data.export.active },
        },
      ];

      // Use backend system timestamp instead of payload timestamp for consistency
      const timestamp = new Date().toISOString();
      // this.logger.debug(
      //   `Processing sensor data for meter ${meterId} at ${timestamp} (backend system time)`,
      // );

      await Promise.all(
        subsystemMappings.map(({ subsystem, data: subsystemData, extraData }) =>
          this.EnergyReadingsDetailedService.create({
            meterId,
            timestamp,
            subsystem,
            dailyEnergyWh: subsystemData.daily_energy_wh * 1000 * 10,
            totalEnergyWh: subsystemData.total_energy_wh * 1000 * 10,
            settlementEnergyWh: subsystemData.settlement_energy_wh * 1000 * 10,
            currentPowerW:
              subsystemData.power < 10 ? 0 : subsystemData.power * 10,
            voltage: subsystemData.voltage,
            currentAmp: subsystemData.current,
            subsystemData: JSON.stringify({
              ...extraData,
              originalTimestamp: data.timestamp, // Keep original timestamp as reference
              backendReceivedAt: timestamp,
            }),
            rawPayload: JSON.stringify(subsystemData),
          }),
        ),
      );
      this.logger.log(
        `Processed sensor data for meter ${meterId} using backend system time`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing sensor data for meter ${meterId}:`,
        error,
      );
    }
  }

  private async processStatus(meterId: string, data: DeviceStatus) {
    try {
      // Use backend system timestamp instead of payload timestamp
      const timestamp = new Date().toISOString();

      await this.deviceStatusSnapshotsService.create({
        meterId,
        timestamp,
        wifiStatus: JSON.stringify(data.wifi),
        mqttStatus: JSON.stringify(data.mqtt),
        gridMode: data.grid.exporting
          ? 'exporting'
          : data.grid.importing
            ? 'importing'
            : 'idle',
        systemStatus: JSON.stringify(data.system),
        rawPayload: JSON.stringify({
          ...data,
          originalTimestamp: data.timestamp, // Keep original timestamp as reference
          backendReceivedAt: timestamp,
        }),
        smartmetersIds: [parseInt(meterId, 10)],
      });

      this.logger.log(
        `Processed status for meter ${meterId} using backend system time`,
      );
    } catch (error) {
      this.logger.error(`Error processing status for meter ${meterId}:`, error);
    }
  }

  async sendCommand(
    meterId: string,
    command: DeviceCommandPayload,
    prosumerId?: string,
  ): Promise<string> {
    try {
      const correlationId = this.cryptoService.generateCorrelationId();
      const commandWithCorrelation = {
        ...command,
        correlation_id: correlationId,
        timestamp: new Date().toISOString(),
      };

      const topic = `${this.topics.command}/${meterId}`;
      const message = JSON.stringify(commandWithCorrelation);

      // Log command
      await this.deviceCommandsService.create({
        meterId,
        commandType: this.getCommandType(command),
        commandPayload: message,
        correlationId,
        status: 'SENT',
        sentAt: new Date().toISOString(),
      });

      // Log MQTT message
      await this.logMessage(
        topic,
        message,
        meterId,
        MqttDirection.OUTBOUND,
        'SENT',
        correlationId,
      );

      // Send via MQTT
      this.client.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Failed to send command to ${meterId}:`, error);
        } else {
          this.logger.log(
            `Command sent to meter ${meterId} with correlation ID ${correlationId}`,
          );
        }
      });

      return correlationId;
    } catch (error) {
      this.logger.error('Error sending command:', error);
      throw error;
    }
  }

  private getCommandType(command: DeviceCommandPayload): DeviceCommandType {
    if (command.grid) return DeviceCommandType.GRID_CONTROL;
    if (command.energy?.reset) return DeviceCommandType.ENERGY_RESET;
    if (command.energy?.reset_settlement)
      return DeviceCommandType.SETTLEMENT_RESET;
    if (command.mqtt) return DeviceCommandType.CONFIGURATION;
    return DeviceCommandType.COMPONENT_CONTROL;
  }

  private async logMessage(
    topic: string,
    message: string,
    meterId: string | null,
    direction: MqttDirection,
    status: string = 'SUCCESS',
    correlationId?: string,
    errorMessage?: string,
  ) {
    try {
      await this.mqttMessageLogsService.create({
        meterId: meterId || 'unknown',
        topicType: this.getTopicType(topic),
        direction,
        mqttTopic: topic,
        payload: message,
        rawMessage: message,
        messageTimestamp: new Date().toISOString(),
        processingStatus: status,
        errorMessage,
        correlationId: correlationId || undefined,
      });
    } catch (error) {
      this.logger.error('Error logging MQTT message:', error);
    }
  }

  private getTopicType(topic: string): MqttTopicType {
    if (topic.includes('sensors')) return MqttTopicType.SENSORS;
    if (topic.includes('heartbeat')) return MqttTopicType.HEARTBEAT;
    if (topic.includes('status')) return MqttTopicType.STATUS;
    if (topic.includes('command')) return MqttTopicType.COMMAND;
    return MqttTopicType.RESPONSE;
  }
}
