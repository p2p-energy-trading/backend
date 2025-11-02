import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as mqtt from 'mqtt';
import { CryptoService } from '../../common/crypto.service';
import { MqttTopicType, DeviceCommandType } from '../../common/enums';
import { DeviceCommandPayload } from '../../common/interfaces';
import { SmartMetersService } from 'src/models/smartMeter/smartMeter.service';
import {
  RedisTelemetryService,
  MeterDataPayload,
  MeterStatusPayload,
} from './redis-telemetry.service';

interface MessageStats {
  totalMessages: number;
  dataMessages: number;
  statusMessages: number;
  meterIds: Set<string>;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;
  private readonly topics = {
    command: 'enerlink/meters/command',
    metersData: 'enerlink/meters/data',
    metersStatus: 'enerlink/meters/status',
  };

  // Message statistics tracking
  private messageStats: MessageStats = {
    totalMessages: 0,
    dataMessages: 0,
    statusMessages: 0,
    meterIds: new Set<string>(),
  };

  constructor(
    private configService: ConfigService,
    // Removed services (MQTT logging now disabled):
    // private mqttMessageLogsService: MqttMessageLogsService,
    // private deviceCommandsService: DeviceCommandsService,
    private cryptoService: CryptoService,
    private smartMetersService: SmartMetersService,
    private redisTelemetryService: RedisTelemetryService,
  ) {}

  onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  /**
   * Log MQTT message statistics every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  logMessageStats() {
    const stats = this.messageStats;

    if (stats.totalMessages > 0) {
      const meterIdList = Array.from(stats.meterIds).join(', ');

      this.logger.log(
        `MQTT Stats (Last Minute): ` +
          `Total: ${stats.totalMessages} messages | ` +
          `Data: ${stats.dataMessages} | ` +
          `Status: ${stats.statusMessages} | ` +
          `Active Meters: ${stats.meterIds.size} [${meterIdList}]`,
      );
    } else {
      this.logger.log('MQTT Stats (Last Minute): No messages received');
    }

    // Reset statistics for next minute
    this.messageStats = {
      totalMessages: 0,
      dataMessages: 0,
      statusMessages: 0,
      meterIds: new Set<string>(),
    };
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
      this.topics.metersData,
      this.topics.metersStatus,
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

      // Track message statistics
      this.messageStats.totalMessages++;
      this.messageStats.meterIds.add(meterId);

      // Update last seen timestamp for the meter
      await this.updateLastSeen(meterId);

      // Process based on topic type
      if (
        topic === this.topics.metersData ||
        topic.includes('enerlink/meters/data')
      ) {
        // Energy measurements in real-time (battery, solar, load, grid)
        this.messageStats.dataMessages++;
        await this.processMeterData(meterId, parsedPayload as MeterDataPayload);
      } else if (
        topic === this.topics.metersStatus ||
        topic.includes('enerlink/meters/status')
      ) {
        // Device metadata (wifi, mqtt, system, sensors)
        this.messageStats.statusMessages++;
        await this.processMeterStatus(
          meterId,
          parsedPayload as MeterStatusPayload,
        );
      }
    } catch (error) {
      this.logger.error('Error processing MQTT message:', error);
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

  sendCommand(
    meterId: string,
    command: DeviceCommandPayload,
    // userId?: string,
  ): string {
    try {
      const correlationId = this.cryptoService.generateCorrelationId();
      const commandWithCorrelation = {
        ...command,
        correlation_id: correlationId,
        timestamp: new Date().toISOString(),
      };

      const topic = `${this.topics.command}/${meterId}`;
      const message = JSON.stringify(commandWithCorrelation);

      // Device command logging disabled - Redis is now the single source of truth
      // Uncomment below if you need database audit trail:
      /*
      await this.deviceCommandsService.create({
        meterId,
        commandType: this.getCommandType(command),
        commandPayload: message,
        correlationId,
        status: 'SENT',
        sentAt: new Date().toISOString(),
      });
      */

      // Send via MQTT
      this.client.publish(topic, message, { qos: 2 }, (error) => {
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

  /**
   * Process meter data from enerlink/meters/data topic
   * Receives energy measurements (battery, solar, load, grid) with settlement_energy
   * Stores to telemetry:latest:data
   */
  private async processMeterData(meterId: string, data: MeterDataPayload) {
    try {
      const timestamp = Date.now();

      // Store latest data (energy measurements) to Redis
      await this.redisTelemetryService.storeLatestData(meterId, data);

      // Store to time-series for aggregation
      await this.redisTelemetryService.storeTimeSeriesSnapshot({
        meterId,
        datetime: data.datetime,
        meterData: data, // Energy measurements (battery, solar, load, grid)
        timestamp,
      });
    } catch (error) {
      this.logger.error(`Error processing meter data for ${meterId}:`, error);
    }
  }

  /**
   * Process meter status from enerlink/meters/status topic
   * Receives device metadata (wifi, mqtt, system, sensors)
   * Stores to telemetry:latest:status
   */
  private async processMeterStatus(
    meterId: string,
    status: MeterStatusPayload,
  ) {
    try {
      const timestamp = Date.now();

      // Store latest status (device metadata) to Redis
      await this.redisTelemetryService.storeLatestStatus(meterId, status);

      // Store to time-series for aggregation
      await this.redisTelemetryService.storeTimeSeriesSnapshot({
        meterId,
        datetime: status.datetime,
        statusData: status, // Device metadata (wifi, mqtt, system, sensors)
        timestamp,
      });
    } catch (error) {
      this.logger.error(`Error processing meter status for ${meterId}:`, error);
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

  private getTopicType(topic: string): MqttTopicType {
    if (topic.includes('sensors')) return MqttTopicType.SENSORS;
    if (topic.includes('heartbeat')) return MqttTopicType.HEARTBEAT;
    if (topic.includes('status')) return MqttTopicType.STATUS;
    if (topic.includes('command')) return MqttTopicType.COMMAND;
    return MqttTopicType.RESPONSE;
  }
}
