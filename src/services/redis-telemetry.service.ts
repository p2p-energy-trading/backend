import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export interface MeterStatusPayload {
  meterId: string;
  datetime: string;
  units: {
    datetime: string;
    uptime: string;
    free_heap: string;
    rssi: string;
  };
  data: {
    wifi: {
      connected: boolean;
      rssi: number;
      ip: string;
    };
    grid: {
      mode: string;
      importing: boolean;
      exporting: boolean;
    };
    mqtt: {
      connected: boolean;
      attempts: number;
      qos: number;
    };
    system: {
      free_heap: number;
      uptime: number;
      status: string;
    };
    sensors: any;
  };
}

export interface MeterDataPayload {
  meterId: string;
  datetime: string;
  units: Record<string, string>;
  data: {
    battery: {
      voltage: number;
      soc: number;
      charge_rate: number;
      is_charging: boolean;
      estimated_capacity: number;
      alert_threshold: number;
      alert_active: boolean;
      connected: boolean;
      valid: boolean;
    };
    export: {
      voltage: number;
      current: number;
      power: number;
      daily_energy: number;
      total_energy: number;
      settlement_energy: number;
      active: boolean;
    };
    import: {
      voltage: number;
      current: number;
      power: number;
      daily_energy: number;
      total_energy: number;
      settlement_energy: number;
      active: boolean;
    };
    load_smart_mtr: {
      voltage: number;
      current: number;
      power: number;
      daily_energy: number;
      total_energy: number;
    };
    load_home: {
      voltage: number;
      current: number;
      power: number;
      daily_energy: number;
      total_energy: number;
    };
    solar_input: {
      voltage: number;
      current: number;
      power: number;
      daily_energy: number;
      total_energy: number;
      generating: boolean;
    };
    solar_output: {
      voltage: number;
      current: number;
      power: number;
      daily_energy: number;
      total_energy: number;
      generating: boolean;
    };
    net_solar: {
      solar_power: number;
      load_power: number;
      net_power: number;
      solar_daily: number;
      load_daily: number;
      net_daily: number;
      solar_total: number;
      load_total: number;
      net_total: number;
      status: string;
    };
    net_grid: {
      export_power: number;
      import_power: number;
      net_power: number;
      export_daily: number;
      import_daily: number;
      net_daily: number;
      export_total: number;
      import_total: number;
      net_total: number;
      status: string;
    };
  };
}

export interface TelemetrySnapshot {
  meterId: string;
  datetime: string;
  meterData?: MeterDataPayload;
  statusData?: MeterStatusPayload;
  timestamp: number;
}

/**
 * Redis service for managing real-time telemetry data
 * - Stores latest meter data and status
 * - Maintains time-series history for aggregation
 * - TTL-based automatic cleanup
 */
@Injectable()
export class RedisTelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisTelemetryService.name);
  private redisClient: Redis;

  // Redis key patterns
  private readonly LATEST_DATA_KEY = 'telemetry:latest:data'; // Hash: meterId -> JSON
  private readonly LATEST_STATUS_KEY = 'telemetry:latest:status'; // Hash: meterId -> JSON
  private readonly TIMESERIES_KEY = 'telemetry:timeseries'; // Sorted Set: score = timestamp

  // TTL configurations (in seconds)
  private readonly LATEST_TTL = 3600; // 1 hour for latest data
  private readonly TIMESERIES_TTL = 7200; // 2 hours for time-series data

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    this.redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(
          `Redis connection retry attempt ${times}, delay: ${delay}ms`,
        );
        return delay;
      },
    });

    this.redisClient.on('connect', () => {
      this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('Redis connection closed');
    }
  }

  /**
   * Store latest meter status (device info, connectivity, sensors)
   */
  async storeLatestStatus(
    meterId: string,
    status: MeterStatusPayload,
  ): Promise<void> {
    try {
      await this.redisClient.hset(
        this.LATEST_STATUS_KEY,
        meterId,
        JSON.stringify(status),
      );

      // Set expiration on the hash key
      await this.redisClient.expire(this.LATEST_STATUS_KEY, this.LATEST_TTL);

      this.logger.debug(`Stored latest status for meter ${meterId}`);
    } catch (error) {
      this.logger.error(
        `Failed to store latest status for meter ${meterId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Store latest meter data (energy measurements with settlement_energy)
   */
  async storeLatestData(
    meterId: string,
    data: MeterDataPayload,
  ): Promise<void> {
    try {
      await this.redisClient.hset(
        this.LATEST_DATA_KEY,
        meterId,
        JSON.stringify(data),
      );

      await this.redisClient.expire(this.LATEST_DATA_KEY, this.LATEST_TTL);

      this.logger.debug(`Stored latest data for meter ${meterId}`);
    } catch (error) {
      this.logger.error(
        `Failed to store latest data for meter ${meterId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Store complete telemetry snapshot in time-series for aggregation
   * Uses sorted set with timestamp as score for efficient range queries
   */
  async storeTimeSeriesSnapshot(snapshot: TelemetrySnapshot): Promise<void> {
    try {
      const key = `${this.TIMESERIES_KEY}:${snapshot.meterId}`;
      const score = snapshot.timestamp;

      await this.redisClient.zadd(key, score, JSON.stringify(snapshot));

      // Set TTL on the sorted set
      await this.redisClient.expire(key, this.TIMESERIES_TTL);

      this.logger.debug(
        `Stored time-series snapshot for meter ${snapshot.meterId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to store time-series snapshot:`, error);
      throw error;
    }
  }

  /**
   * Get latest meter status for a specific meter
   */
  async getLatestStatus(meterId: string): Promise<MeterStatusPayload | null> {
    try {
      const status = await this.redisClient.hget(
        this.LATEST_STATUS_KEY,
        meterId,
      );
      return status ? JSON.parse(status) : null;
    } catch (error) {
      this.logger.error(
        `Failed to get latest status for meter ${meterId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get latest meter data for a specific meter (with settlement_energy)
   */
  async getLatestData(meterId: string): Promise<MeterDataPayload | null> {
    try {
      const data = await this.redisClient.hget(this.LATEST_DATA_KEY, meterId);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(
        `Failed to get latest data for meter ${meterId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get latest status for all meters
   */
  async getAllLatestStatus(): Promise<Record<string, MeterStatusPayload>> {
    try {
      const allStatus = await this.redisClient.hgetall(this.LATEST_STATUS_KEY);
      const result: Record<string, MeterStatusPayload> = {};

      for (const [meterId, jsonStatus] of Object.entries(allStatus)) {
        result[meterId] = JSON.parse(jsonStatus);
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to get all latest status:', error);
      return {};
    }
  }

  /**
   * Get latest data for all meters (with settlement_energy)
   */
  async getAllLatestData(): Promise<Record<string, MeterDataPayload>> {
    try {
      const allData = await this.redisClient.hgetall(this.LATEST_DATA_KEY);
      const result: Record<string, MeterDataPayload> = {};

      for (const [meterId, jsonData] of Object.entries(allData)) {
        result[meterId] = JSON.parse(jsonData);
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to get all latest data:', error);
      return {};
    }
  }

  /**
   * Get time-series snapshots for a meter within a time range
   * Used by aggregation service to compute hourly averages
   */
  async getTimeSeriesSnapshots(
    meterId: string,
    startTimestamp: number,
    endTimestamp: number,
  ): Promise<TelemetrySnapshot[]> {
    try {
      const key = `${this.TIMESERIES_KEY}:${meterId}`;
      const results = await this.redisClient.zrangebyscore(
        key,
        startTimestamp,
        endTimestamp,
      );

      return results.map((item) => JSON.parse(item));
    } catch (error) {
      this.logger.error(
        `Failed to get time-series for meter ${meterId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Delete time-series data older than a specific timestamp
   * Used after successful aggregation to free memory
   */
  async cleanupOldTimeSeries(
    meterId: string,
    beforeTimestamp: number,
  ): Promise<void> {
    try {
      const key = `${this.TIMESERIES_KEY}:${meterId}`;
      const removed = await this.redisClient.zremrangebyscore(
        key,
        '-inf',
        beforeTimestamp,
      );

      this.logger.debug(
        `Cleaned up ${removed} old time-series entries for meter ${meterId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cleanup time-series for meter ${meterId}:`,
        error,
      );
    }
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient(): Redis {
    return this.redisClient;
  }

  /**
   * Health check - test Redis connectivity
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping failed:', error);
      return false;
    }
  }
}
