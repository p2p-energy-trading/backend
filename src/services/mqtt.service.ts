import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { MqttMessageLogsService } from '../graphql/MqttMessageLogs/MqttMessageLogs.service';
import { EnergyReadingsService } from '../graphql/EnergyReadings/EnergyReadings.service';
import { DeviceHeartbeatsService } from '../graphql/DeviceHeartbeats/DeviceHeartbeats.service';
import { DeviceStatusSnapshotsService } from '../graphql/DeviceStatusSnapshots/DeviceStatusSnapshots.service';
import { DeviceCommandsService } from '../graphql/DeviceCommands/DeviceCommands.service';
import { CryptoService } from '../common/crypto.service';
import {
  MqttTopicType,
  MqttDirection,
  DeviceCommandType,
} from '../common/enums';
import {
  SensorData,
  DeviceHeartbeat,
  DeviceStatus,
  DeviceCommandPayload,
} from '../common/interfaces';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;
  private readonly topics = {
    sensors: 'home/energy-monitor/sensors',
    heartbeat: 'home/energy-monitor/heartbeat',
    status: 'home/energy-monitor/status',
    command: 'home/energy-monitor/command',
  };

  constructor(
    private configService: ConfigService,
    private mqttMessageLogsService: MqttMessageLogsService,
    private energyReadingsService: EnergyReadingsService,
    private deviceHeartbeatsService: DeviceHeartbeatsService,
    private deviceStatusSnapshotsService: DeviceStatusSnapshotsService,
    private deviceCommandsService: DeviceCommandsService,
    private cryptoService: CryptoService,
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
    const topicsToSubscribe = [
      this.topics.sensors,
      this.topics.heartbeat,
      this.topics.status,
    ];

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

  private async handleMessage(topic: string, message: Buffer) {
    try {
      const payload = message.toString();
      const parsedPayload: unknown = JSON.parse(payload);

      // Validate that parsedPayload is an object
      if (typeof parsedPayload !== 'object' || parsedPayload === null) {
        throw new Error('Invalid JSON payload: not an object');
      }

      // Extract meter ID from topic or payload
      // const meterId = this.extractMeterId(topic, parsedPayload);
      const meterId = 'METER001';
      // Log message
      await this.logMessage(topic, payload, meterId, MqttDirection.INBOUND);

      // Process based on topic type
      if (topic.includes('sensors')) {
        await this.processSensorData(meterId, parsedPayload as SensorData);
      }
      // } else if (topic.includes('heartbeat')) {
      //   await this.processHeartbeat(meterId, parsedPayload as DeviceHeartbeat);
      // } else if (topic.includes('status')) {
      //   await this.processStatus(meterId, parsedPayload as DeviceStatus);
      // }
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
      // Calculate net power in kW (solar - load)
      const netPowerW = data.solar.power - data.load.power;
      const powerKw = netPowerW / 1000; // Convert from W to kW

      // Determine flow direction based on net power
      const flowDirection = netPowerW > 0 ? 'export' : 'import';

      // Calculate voltage and current (assuming standard 230V for residential)
      const voltage = 230; // Standard residential voltage
      const currentAmp = Math.abs(netPowerW) / voltage; // Current = Power / Voltage

      // Store energy reading with correct schema fields
      await this.energyReadingsService.create({
        meterId,
        timestamp: new Date(data.timestamp).toISOString(),
        voltage,
        currentAmp,
        powerKw: Math.abs(powerKw), // Store absolute value
        flowDirection,
        smartmetersIds: [parseInt(meterId, 10)],
      });

      this.logger.log(
        `Processed sensor data for meter ${meterId}: ${powerKw.toFixed(
          3,
        )}kW ${flowDirection}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing sensor data for meter ${meterId}:`,
        error,
      );
    }
  }

  private async processHeartbeat(meterId: string, data: DeviceHeartbeat) {
    try {
      await this.deviceHeartbeatsService.create({
        meterId,
        timestamp: new Date(data.timestamp).toISOString(),
        uptimeSeconds: data.uptime_seconds.toString(),
        freeHeapBytes: data.free_heap_bytes.toString(),
        signalStrength: data.signal_strength,
        additionalMetrics: JSON.stringify(data.additional_metrics || {}),
        smartmetersIds: [parseInt(meterId, 10)],
      });

      this.logger.log(`Processed heartbeat for meter ${meterId}`);
    } catch (error) {
      this.logger.error(
        `Error processing heartbeat for meter ${meterId}:`,
        error,
      );
    }
  }

  private async processStatus(meterId: string, data: DeviceStatus) {
    try {
      await this.deviceStatusSnapshotsService.create({
        meterId,
        timestamp: new Date(data.timestamp).toISOString(),
        wifiStatus: data.wifi_status,
        mqttStatus: data.mqtt_status,
        gridMode: data.grid_mode,
        systemStatus: data.system_status,
        rawPayload: JSON.stringify(data),
        smartmetersIds: [parseInt(meterId, 10)],
      });

      this.logger.log(`Processed status for meter ${meterId}`);
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
        smartmetersIds: [parseInt(meterId, 10)],
        prosumersIds: prosumerId ? [parseInt(prosumerId, 10)] : [],
      });

      // Log MQTT message
      await this.logMessage(
        topic,
        message,
        meterId,
        MqttDirection.OUTBOUND,
        'SENT',
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
