import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisTelemetryService } from '../../../src/services/telemetry/redis-telemetry.service';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

describe('RedisTelemetryService', () => {
  let service: RedisTelemetryService;
  let mockRedis: jest.Mocked<Redis>;

  const mockMeterStatusPayload = {
    meterId: 'METER001',
    datetime: '2025-10-27T10:00:00Z',
    units: {
      datetime: 'ISO8601',
      uptime: 'seconds',
      free_heap: 'bytes',
      rssi: 'dBm',
    },
    data: {
      wifi: {
        connected: true,
        rssi: -60,
        ip: '192.168.1.100',
      },
      grid: {
        mode: 'export',
        importing: false,
        exporting: true,
      },
      mqtt: {
        connected: true,
        attempts: 0,
        qos: 2,
      },
      system: {
        free_heap: 50000,
        uptime: 123456,
        status: 'alive',
      },
      sensors: {},
    },
  };

  const mockMeterDataPayload = {
    meterId: 'METER001',
    datetime: '2025-10-27T10:00:00Z',
    units: {},
    data: {
      battery: {
        voltage: 12.5,
        soc: 80,
        charge_rate: 5.5,
        is_charging: true,
        estimated_capacity: 100,
        alert_threshold: 20,
        alert_active: false,
        connected: true,
        valid: true,
      },
      export: {
        voltage: 220,
        current: 1.5,
        power: 330,
        daily_energy: 1000,
        total_energy: 10000,
        settlement_energy: 500,
        active: true,
      },
      import: {
        voltage: 220,
        current: 0.5,
        power: 110,
        daily_energy: 500,
        total_energy: 5000,
        settlement_energy: 200,
        active: false,
      },
      load_smart_mtr: {
        voltage: 220,
        current: 2.0,
        power: 440,
        daily_energy: 2000,
        total_energy: 20000,
      },
      load_home: {
        voltage: 220,
        current: 1.0,
        power: 220,
        daily_energy: 1000,
        total_energy: 10000,
      },
      solar_input: {
        voltage: 48,
        current: 10,
        power: 480,
        daily_energy: 3000,
        total_energy: 30000,
        generating: true,
      },
      solar_output: {
        voltage: 220,
        current: 3.5,
        power: 770,
        daily_energy: 4000,
        total_energy: 40000,
        generating: true,
      },
      net_solar: {
        solar_power: 770,
        load_power: 660,
        net_power: 110,
        solar_daily: 4000,
        load_daily: 3000,
        net_daily: 1000,
        solar_total: 40000,
        load_total: 30000,
        net_total: 10000,
        status: 'generating',
      },
      net_grid: {
        export_power: 330,
        import_power: 0,
        net_power: 330,
        export_daily: 1000,
        import_daily: 0,
        net_daily: 1000,
        export_total: 10000,
        import_total: 0,
        net_total: 10000,
        status: 'exporting',
      },
    },
  };

  const mockTelemetrySnapshot = {
    meterId: 'METER001',
    datetime: '2025-10-27T10:00:00Z',
    timestamp: Date.now(),
    meterData: mockMeterDataPayload,
    statusData: mockMeterStatusPayload,
  };

  beforeEach(async () => {
    // Create mock Redis instance
    mockRedis = {
      hset: jest.fn().mockResolvedValue(1),
      hget: jest.fn(),
      hgetall: jest.fn(),
      zadd: jest.fn().mockResolvedValue(1),
      zrangebyscore: jest.fn(),
      zremrangebyscore: jest.fn(),
      expire: jest.fn().mockResolvedValue(1),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue('OK'),
      on: jest.fn(),
    } as any;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(
      () => mockRedis,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisTelemetryService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
                REDIS_PASSWORD: undefined,
              };
              return config[key] !== undefined ? config[key] : defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisTelemetryService>(RedisTelemetryService);

    // Initialize the module
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize Redis client with correct configuration', async () => {
      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: undefined,
        retryStrategy: expect.any(Function),
      });
    });

    it('should register event listeners', async () => {
      expect(mockRedis.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection', async () => {
      await service.onModuleDestroy();
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });

  describe('storeLatestStatus', () => {
    it('should store meter status in Redis hash', async () => {
      await service.storeLatestStatus('METER001', mockMeterStatusPayload);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'telemetry:latest:status',
        'METER001',
        JSON.stringify(mockMeterStatusPayload),
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'telemetry:latest:status',
        3600,
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.hset.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.storeLatestStatus('METER001', mockMeterStatusPayload),
      ).rejects.toThrow('Redis error');
    });
  });

  describe('storeLatestData', () => {
    it('should store meter data in Redis hash', async () => {
      await service.storeLatestData('METER001', mockMeterDataPayload);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'telemetry:latest:data',
        'METER001',
        JSON.stringify(mockMeterDataPayload),
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'telemetry:latest:data',
        3600,
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.hset.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.storeLatestData('METER001', mockMeterDataPayload),
      ).rejects.toThrow('Redis error');
    });
  });

  describe('storeTimeSeriesSnapshot', () => {
    it('should store snapshot in sorted set with timestamp as score', async () => {
      await service.storeTimeSeriesSnapshot(mockTelemetrySnapshot);

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'telemetry:timeseries:METER001',
        mockTelemetrySnapshot.timestamp,
        JSON.stringify(mockTelemetrySnapshot),
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'telemetry:timeseries:METER001',
        7200,
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.zadd.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.storeTimeSeriesSnapshot(mockTelemetrySnapshot),
      ).rejects.toThrow('Redis error');
    });
  });

  describe('getLatestStatus', () => {
    it('should retrieve and parse meter status', async () => {
      mockRedis.hget.mockResolvedValue(JSON.stringify(mockMeterStatusPayload));

      const result = await service.getLatestStatus('METER001');

      expect(mockRedis.hget).toHaveBeenCalledWith(
        'telemetry:latest:status',
        'METER001',
      );
      expect(result).toEqual(mockMeterStatusPayload);
    });

    it('should return null when status not found', async () => {
      mockRedis.hget.mockResolvedValue(null);

      const result = await service.getLatestStatus('METER001');

      expect(result).toBeNull();
    });

    it('should return null on Redis error', async () => {
      mockRedis.hget.mockRejectedValue(new Error('Redis error'));

      const result = await service.getLatestStatus('METER001');

      expect(result).toBeNull();
    });
  });

  describe('getLatestData', () => {
    it('should retrieve and parse meter data', async () => {
      mockRedis.hget.mockResolvedValue(JSON.stringify(mockMeterDataPayload));

      const result = await service.getLatestData('METER001');

      expect(mockRedis.hget).toHaveBeenCalledWith(
        'telemetry:latest:data',
        'METER001',
      );
      expect(result).toEqual(mockMeterDataPayload);
    });

    it('should return null when data not found', async () => {
      mockRedis.hget.mockResolvedValue(null);

      const result = await service.getLatestData('METER001');

      expect(result).toBeNull();
    });

    it('should return null on Redis error', async () => {
      mockRedis.hget.mockRejectedValue(new Error('Redis error'));

      const result = await service.getLatestData('METER001');

      expect(result).toBeNull();
    });
  });

  describe('getAllLatestStatus', () => {
    it('should retrieve and parse all meter statuses', async () => {
      const allStatuses = {
        METER001: JSON.stringify(mockMeterStatusPayload),
        METER002: JSON.stringify({
          ...mockMeterStatusPayload,
          meterId: 'METER002',
        }),
      };
      mockRedis.hgetall.mockResolvedValue(allStatuses);

      const result = await service.getAllLatestStatus();

      expect(mockRedis.hgetall).toHaveBeenCalledWith('telemetry:latest:status');
      expect(result).toEqual({
        METER001: mockMeterStatusPayload,
        METER002: { ...mockMeterStatusPayload, meterId: 'METER002' },
      });
    });

    it('should return empty object when no statuses found', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const result = await service.getAllLatestStatus();

      expect(result).toEqual({});
    });

    it('should return empty object on Redis error', async () => {
      mockRedis.hgetall.mockRejectedValue(new Error('Redis error'));

      const result = await service.getAllLatestStatus();

      expect(result).toEqual({});
    });
  });

  describe('getAllLatestData', () => {
    it('should retrieve and parse all meter data', async () => {
      const allData = {
        METER001: JSON.stringify(mockMeterDataPayload),
        METER002: JSON.stringify({
          ...mockMeterDataPayload,
          meterId: 'METER002',
        }),
      };
      mockRedis.hgetall.mockResolvedValue(allData);

      const result = await service.getAllLatestData();

      expect(mockRedis.hgetall).toHaveBeenCalledWith('telemetry:latest:data');
      expect(result).toEqual({
        METER001: mockMeterDataPayload,
        METER002: { ...mockMeterDataPayload, meterId: 'METER002' },
      });
    });

    it('should return empty object when no data found', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const result = await service.getAllLatestData();

      expect(result).toEqual({});
    });

    it('should return empty object on Redis error', async () => {
      mockRedis.hgetall.mockRejectedValue(new Error('Redis error'));

      const result = await service.getAllLatestData();

      expect(result).toEqual({});
    });
  });

  describe('getTimeSeriesSnapshots', () => {
    it('should retrieve snapshots within time range', async () => {
      const startTime = Date.now() - 3600000; // 1 hour ago
      const endTime = Date.now();
      const snapshots = [
        JSON.stringify({
          ...mockTelemetrySnapshot,
          timestamp: startTime + 1000,
        }),
        JSON.stringify({
          ...mockTelemetrySnapshot,
          timestamp: startTime + 2000,
        }),
      ];
      mockRedis.zrangebyscore.mockResolvedValue(snapshots);

      const result = await service.getTimeSeriesSnapshots(
        'METER001',
        startTime,
        endTime,
      );

      expect(mockRedis.zrangebyscore).toHaveBeenCalledWith(
        'telemetry:timeseries:METER001',
        startTime,
        endTime,
      );
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(startTime + 1000);
    });

    it('should return empty array when no snapshots found', async () => {
      mockRedis.zrangebyscore.mockResolvedValue([]);

      const result = await service.getTimeSeriesSnapshots(
        'METER001',
        0,
        Date.now(),
      );

      expect(result).toEqual([]);
    });

    it('should return empty array on Redis error', async () => {
      mockRedis.zrangebyscore.mockRejectedValue(new Error('Redis error'));

      const result = await service.getTimeSeriesSnapshots(
        'METER001',
        0,
        Date.now(),
      );

      expect(result).toEqual([]);
    });
  });

  describe('cleanupOldTimeSeries', () => {
    it('should remove time-series data older than timestamp', async () => {
      const beforeTimestamp = Date.now() - 7200000; // 2 hours ago
      mockRedis.zremrangebyscore.mockResolvedValue(10);

      await service.cleanupOldTimeSeries('METER001', beforeTimestamp);

      expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
        'telemetry:timeseries:METER001',
        '-inf',
        beforeTimestamp,
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      mockRedis.zremrangebyscore.mockRejectedValue(new Error('Redis error'));

      // Should not throw, just log error
      await expect(
        service.cleanupOldTimeSeries('METER001', Date.now()),
      ).resolves.not.toThrow();
    });
  });

  describe('getClient', () => {
    it('should return Redis client instance', () => {
      const client = service.getClient();

      expect(client).toBe(mockRedis);
    });
  });

  describe('ping', () => {
    it('should return true when Redis responds with PONG', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const result = await service.ping();

      expect(result).toBe(true);
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should return false on Redis error', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await service.ping();

      expect(result).toBe(false);
    });
  });

  describe('Redis key patterns', () => {
    it('should use correct key pattern for latest status', async () => {
      await service.storeLatestStatus('METER001', mockMeterStatusPayload);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'telemetry:latest:status',
        expect.any(String),
        expect.any(String),
      );
    });

    it('should use correct key pattern for latest data', async () => {
      await service.storeLatestData('METER001', mockMeterDataPayload);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'telemetry:latest:data',
        expect.any(String),
        expect.any(String),
      );
    });

    it('should use correct key pattern for time-series with meterId', async () => {
      await service.storeTimeSeriesSnapshot(mockTelemetrySnapshot);

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'telemetry:timeseries:METER001',
        expect.any(Number),
        expect.any(String),
      );
    });
  });

  describe('TTL configurations', () => {
    it('should set 1 hour TTL for latest status', async () => {
      await service.storeLatestStatus('METER001', mockMeterStatusPayload);

      expect(mockRedis.expire).toHaveBeenCalledWith(
        'telemetry:latest:status',
        3600,
      );
    });

    it('should set 1 hour TTL for latest data', async () => {
      await service.storeLatestData('METER001', mockMeterDataPayload);

      expect(mockRedis.expire).toHaveBeenCalledWith(
        'telemetry:latest:data',
        3600,
      );
    });

    it('should set 2 hours TTL for time-series data', async () => {
      await service.storeTimeSeriesSnapshot(mockTelemetrySnapshot);

      expect(mockRedis.expire).toHaveBeenCalledWith(
        'telemetry:timeseries:METER001',
        7200,
      );
    });
  });
});
