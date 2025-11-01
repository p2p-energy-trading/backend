import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelemetryAggregationService } from '../../../src/services/telemetry/telemetry-aggregation.service';
import { TelemetryAggregate } from '../../../src/models/telemetryAggregate/telemetryAggregate.entity';
import { RedisTelemetryService } from '../../../src/services/telemetry/redis-telemetry.service';
import {
  createMockRepository,
  createMockQueryBuilder,
} from '../../helpers/mock-repository.helper';

describe('TelemetryAggregationService', () => {
  let service: TelemetryAggregationService;
  let telemetryAggregateRepo: any;
  let redisTelemetryService: jest.Mocked<RedisTelemetryService>;

  // Helper to create mock telemetry snapshots
  const createMockSnapshot = (timestamp: number, overrides?: any) => ({
    meterId: 'METER001',
    datetime: new Date(timestamp).toISOString(),
    timestamp,
    meterData: {
      meterId: 'METER001',
      datetime: new Date(timestamp).toISOString(),
      units: {},
      data: {
        battery: {
          voltage: overrides?.batteryVoltage || 12.5,
          soc: overrides?.batterySoc || 80,
          charge_rate: overrides?.batteryChargeRate || 5.5,
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
          power: overrides?.exportPower || 330,
          daily_energy: 1000,
          total_energy: overrides?.exportEnergyTotal || 10000,
          settlement_energy: 500,
          active: true,
        },
        import: {
          voltage: 220,
          current: 0.5,
          power: overrides?.importPower || 110,
          daily_energy: 500,
          total_energy: overrides?.importEnergyTotal || 5000,
          settlement_energy: 200,
          active: false,
        },
        load_smart_mtr: {
          voltage: 220,
          current: 2.0,
          power: overrides?.loadSmartPower || 440,
          daily_energy: 2000,
          total_energy: overrides?.loadSmartEnergyTotal || 20000,
        },
        load_home: {
          voltage: 220,
          current: 1.0,
          power: overrides?.loadHomePower || 220,
          daily_energy: 1000,
          total_energy: overrides?.loadHomeEnergyTotal || 10000,
        },
        solar_input: {
          voltage: 48,
          current: 10,
          power: overrides?.solarInputPower || 480,
          daily_energy: 3000,
          total_energy: overrides?.solarInputEnergyTotal || 30000,
        },
        solar_output: {
          voltage: 220,
          current: 3.5,
          power: overrides?.solarOutputPower || 770,
          daily_energy: 4000,
          total_energy: overrides?.solarOutputEnergyTotal || 40000,
        },
        net_solar: {
          power: overrides?.netSolarPower || 330,
        },
        net_grid: {
          power: overrides?.netGridPower || 220,
        },
      },
    },
    statusData: {
      meterId: 'METER001',
      datetime: new Date(timestamp).toISOString(),
      units: {},
      data: {
        wifi: {
          rssi: overrides?.wifiRssi || -60,
          connected: true,
          ip: '192.168.1.100',
        },
        mqtt: {
          connected:
            overrides?.mqttConnected !== undefined
              ? overrides.mqttConnected
              : true,
          attempts: 0,
        },
        system: {
          free_heap: overrides?.freeHeap || 50000,
        },
      },
    } as any,
  });

  beforeEach(async () => {
    telemetryAggregateRepo = createMockRepository();
    redisTelemetryService = {
      getAllLatestStatus: jest.fn(),
      getTimeSeriesSnapshots: jest.fn(),
      cleanupOldTimeSeries: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryAggregationService,
        {
          provide: getRepositoryToken(TelemetryAggregate),
          useValue: telemetryAggregateRepo,
        },
        {
          provide: RedisTelemetryService,
          useValue: redisTelemetryService,
        },
      ],
    }).compile();

    // Suppress logger output
    module.useLogger(false);

    service = module.get<TelemetryAggregationService>(
      TelemetryAggregationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('aggregateHourlyData', () => {
    it('should aggregate data for all meters successfully', async () => {
      const mockStatus = {
        METER001: { timestamp: Date.now() },
        METER002: { timestamp: Date.now() },
      };

      const now = new Date();
      const hourAgo = new Date(now.getTime() - 3600000);
      const twoHoursAgo = new Date(now.getTime() - 7200000);

      const mockSnapshots1 = [
        createMockSnapshot(hourAgo.getTime(), { exportPower: 300 }),
        createMockSnapshot(hourAgo.getTime() + 1800000, { exportPower: 350 }),
      ];

      const mockSnapshots2 = [
        createMockSnapshot(hourAgo.getTime(), { exportPower: 400 }),
      ];

      redisTelemetryService.getAllLatestStatus.mockResolvedValue(
        mockStatus as any,
      );
      redisTelemetryService.getTimeSeriesSnapshots
        .mockResolvedValueOnce(mockSnapshots1 as any)
        .mockResolvedValueOnce(mockSnapshots2 as any);
      redisTelemetryService.cleanupOldTimeSeries.mockResolvedValue(undefined);

      await service.aggregateHourlyData();

      expect(redisTelemetryService.getAllLatestStatus).toHaveBeenCalled();
      expect(
        redisTelemetryService.getTimeSeriesSnapshots,
      ).toHaveBeenCalledTimes(2);
      expect(telemetryAggregateRepo.save).toHaveBeenCalledTimes(2);
      expect(redisTelemetryService.cleanupOldTimeSeries).toHaveBeenCalledTimes(
        2,
      );
    });

    it('should handle empty meter list gracefully', async () => {
      redisTelemetryService.getAllLatestStatus.mockResolvedValue({} as any);

      await service.aggregateHourlyData();

      expect(redisTelemetryService.getAllLatestStatus).toHaveBeenCalled();
      expect(
        redisTelemetryService.getTimeSeriesSnapshots,
      ).not.toHaveBeenCalled();
      expect(telemetryAggregateRepo.save).not.toHaveBeenCalled();
    });

    it('should continue processing other meters if one fails', async () => {
      const mockStatus = {
        METER001: { timestamp: Date.now() },
        METER002: { timestamp: Date.now() },
        METER003: { timestamp: Date.now() },
      };

      const now = new Date();
      const hourAgo = new Date(now.getTime() - 3600000);

      const mockSnapshots = [createMockSnapshot(hourAgo.getTime())];

      redisTelemetryService.getAllLatestStatus.mockResolvedValue(
        mockStatus as any,
      );
      redisTelemetryService.getTimeSeriesSnapshots
        .mockResolvedValueOnce(mockSnapshots as any)
        .mockRejectedValueOnce(new Error('Redis error'))
        .mockResolvedValueOnce(mockSnapshots as any);

      await service.aggregateHourlyData();

      expect(telemetryAggregateRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should handle no snapshots for a meter', async () => {
      const mockStatus = {
        METER001: { timestamp: Date.now() },
      };

      redisTelemetryService.getAllLatestStatus.mockResolvedValue(
        mockStatus as any,
      );
      redisTelemetryService.getTimeSeriesSnapshots.mockResolvedValue([]);

      await service.aggregateHourlyData();

      expect(telemetryAggregateRepo.save).not.toHaveBeenCalled();
      expect(redisTelemetryService.cleanupOldTimeSeries).not.toHaveBeenCalled();
    });

    it('should handle getAllLatestStatus error gracefully', async () => {
      redisTelemetryService.getAllLatestStatus.mockRejectedValue(
        new Error('Redis connection failed'),
      );

      await expect(service.aggregateHourlyData()).resolves.not.toThrow();

      expect(telemetryAggregateRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('manualAggregate', () => {
    it('should manually aggregate data for specified hour', async () => {
      const hourStart = new Date('2025-10-27T10:00:00Z');
      const mockStatus = {
        METER001: { timestamp: Date.now() },
      };

      const mockSnapshots = [
        createMockSnapshot(hourStart.getTime(), { exportPower: 300 }),
        createMockSnapshot(hourStart.getTime() + 1800000, { exportPower: 350 }),
      ];

      redisTelemetryService.getAllLatestStatus.mockResolvedValue(
        mockStatus as any,
      );
      redisTelemetryService.getTimeSeriesSnapshots.mockResolvedValue(
        mockSnapshots as any,
      );
      redisTelemetryService.cleanupOldTimeSeries.mockResolvedValue(undefined);

      await service.manualAggregate(hourStart);

      expect(redisTelemetryService.getTimeSeriesSnapshots).toHaveBeenCalledWith(
        'METER001',
        hourStart.getTime(),
        hourStart.getTime() + 3600000, // +1 hour
      );
      expect(telemetryAggregateRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should process multiple meters in manual aggregation', async () => {
      const hourStart = new Date('2025-10-27T10:00:00Z');
      const mockStatus = {
        METER001: { timestamp: Date.now() },
        METER002: { timestamp: Date.now() },
      };

      const mockSnapshots = [createMockSnapshot(hourStart.getTime())];

      redisTelemetryService.getAllLatestStatus.mockResolvedValue(
        mockStatus as any,
      );
      redisTelemetryService.getTimeSeriesSnapshots.mockResolvedValue(
        mockSnapshots as any,
      );
      redisTelemetryService.cleanupOldTimeSeries.mockResolvedValue(undefined);

      await service.manualAggregate(hourStart);

      expect(
        redisTelemetryService.getTimeSeriesSnapshots,
      ).toHaveBeenCalledTimes(2);
      expect(telemetryAggregateRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during manual aggregation', async () => {
      const hourStart = new Date('2025-10-27T10:00:00Z');

      redisTelemetryService.getAllLatestStatus.mockRejectedValue(
        new Error('Redis error'),
      );

      await expect(service.manualAggregate(hourStart)).rejects.toThrow(
        'Redis error',
      );
    });
  });

  describe('getHourlyHistory', () => {
    it('should retrieve hourly history for specified hours', async () => {
      const prosumerId = 'PROSUMER001';
      const hours = 24;

      const now = new Date();
      const mockAggregates = [
        {
          hourStart: new Date(now.getTime() - 3600000),
          solarInputEnergyTotal: 5000,
          loadSmartEnergyTotal: 2000,
          loadHomeEnergyTotal: 1000,
          exportEnergyTotal: 1500,
          importEnergyTotal: 500,
          netGridEnergyTotal: 1000,
        },
        {
          hourStart: new Date(now.getTime() - 7200000),
          solarInputEnergyTotal: 4500,
          loadSmartEnergyTotal: 1800,
          loadHomeEnergyTotal: 900,
          exportEnergyTotal: 1200,
          importEnergyTotal: 400,
          netGridEnergyTotal: 800,
        },
      ];

      const mockQB = createMockQueryBuilder();
      telemetryAggregateRepo.createQueryBuilder.mockReturnValue(mockQB);
      (mockQB.getMany as jest.Mock).mockResolvedValue(mockAggregates);

      const result = await service.getHourlyHistory(prosumerId, hours);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].solar).toBe(5000);
      expect(result[0].consumption).toBe(3000); // 2000 + 1000
      expect(result[0].gridExport).toBe(1500);
      expect(result[0].gridImport).toBe(500);
      expect(result[0].net).toBe(1000); // 1500 - 500
    });

    it('should filter by meterId when provided', async () => {
      const prosumerId = 'PROSUMER001';
      const hours = 24;
      const meterId = 'METER001';

      const mockQB = createMockQueryBuilder();
      telemetryAggregateRepo.createQueryBuilder.mockReturnValue(mockQB);
      (mockQB.getMany as jest.Mock).mockResolvedValue([]);

      await service.getHourlyHistory(prosumerId, hours, meterId);

      expect(mockQB.andWhere).toHaveBeenCalledWith('ta.meter_id = :meterId', {
        meterId: 'METER001',
      });
    });

    it('should not filter by meterId when not provided', async () => {
      const prosumerId = 'PROSUMER001';
      const hours = 24;

      const mockQB = createMockQueryBuilder();
      telemetryAggregateRepo.createQueryBuilder.mockReturnValue(mockQB);
      (mockQB.getMany as jest.Mock).mockResolvedValue([]);

      await service.getHourlyHistory(prosumerId, hours);

      expect(mockQB.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('meter_id'),
        expect.anything(),
      );
    });

    it('should use default 24 hours when hours not specified', async () => {
      const prosumerId = 'PROSUMER001';

      const mockQB = createMockQueryBuilder();
      telemetryAggregateRepo.createQueryBuilder.mockReturnValue(mockQB);
      (mockQB.getMany as jest.Mock).mockResolvedValue([]);

      await service.getHourlyHistory(prosumerId);

      expect(mockQB.where).toHaveBeenCalledWith(
        'ta.hour_start >= :hourStart',
        expect.objectContaining({ hourStart: expect.any(Date) }),
      );
    });

    it('should handle null energy values in aggregates', async () => {
      const prosumerId = 'PROSUMER001';

      const mockAggregates = [
        {
          hourStart: new Date(),
          solarInputEnergyTotal: null,
          loadSmartEnergyTotal: null,
          loadHomeEnergyTotal: null,
          exportEnergyTotal: null,
          importEnergyTotal: null,
          netGridEnergyTotal: null,
        },
      ];

      const mockQB = createMockQueryBuilder();
      telemetryAggregateRepo.createQueryBuilder.mockReturnValue(mockQB);
      (mockQB.getMany as jest.Mock).mockResolvedValue(mockAggregates);

      const result = await service.getHourlyHistory(prosumerId, 24);

      expect(result[0].solar).toBe(0);
      expect(result[0].consumption).toBe(0);
      expect(result[0].gridExport).toBe(0);
      expect(result[0].gridImport).toBe(0);
      expect(result[0].net).toBe(0);
    });

    it('should return empty array when no aggregates found', async () => {
      const prosumerId = 'PROSUMER001';

      const mockQB = createMockQueryBuilder();
      telemetryAggregateRepo.createQueryBuilder.mockReturnValue(mockQB);
      (mockQB.getMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getHourlyHistory(prosumerId, 24);

      expect(result).toEqual([]);
    });

    it('should order results by hour start ascending', async () => {
      const prosumerId = 'PROSUMER001';

      const mockQB = createMockQueryBuilder();
      telemetryAggregateRepo.createQueryBuilder.mockReturnValue(mockQB);
      (mockQB.getMany as jest.Mock).mockResolvedValue([]);

      await service.getHourlyHistory(prosumerId, 24);

      expect(mockQB.orderBy).toHaveBeenCalledWith('ta.hour_start', 'ASC');
    });
  });

  describe('aggregate calculations', () => {
    it('should calculate correct aggregates from snapshots', async () => {
      const hourStart = new Date('2025-10-27T10:00:00Z');
      const mockStatus = {
        METER001: { timestamp: Date.now() },
      };

      // Create snapshots with different values to test aggregation
      const mockSnapshots = [
        createMockSnapshot(hourStart.getTime(), {
          batteryVoltage: 12.0,
          batterySoc: 70,
          exportPower: 300,
          exportEnergyTotal: 10000,
          importPower: 100,
          importEnergyTotal: 5000,
          loadSmartPower: 400,
          loadSmartEnergyTotal: 20000,
          loadHomePower: 200,
          loadHomeEnergyTotal: 10000,
          solarInputPower: 500,
          solarInputEnergyTotal: 30000,
          solarOutputPower: 700,
          solarOutputEnergyTotal: 40000,
          wifiRssi: -70,
          freeHeap: 40000,
          mqttConnected: true,
        }),
        createMockSnapshot(hourStart.getTime() + 1800000, {
          batteryVoltage: 12.5,
          batterySoc: 80,
          exportPower: 350,
          exportEnergyTotal: 10500,
          importPower: 120,
          importEnergyTotal: 5200,
          loadSmartPower: 450,
          loadSmartEnergyTotal: 20500,
          loadHomePower: 220,
          loadHomeEnergyTotal: 10300,
          solarInputPower: 550,
          solarInputEnergyTotal: 30600,
          solarOutputPower: 750,
          solarOutputEnergyTotal: 40800,
          wifiRssi: -60,
          freeHeap: 45000,
          mqttConnected: true,
        }),
      ];

      redisTelemetryService.getAllLatestStatus.mockResolvedValue(
        mockStatus as any,
      );
      redisTelemetryService.getTimeSeriesSnapshots.mockResolvedValue(
        mockSnapshots as any,
      );
      redisTelemetryService.cleanupOldTimeSeries.mockResolvedValue(undefined);

      await service.aggregateHourlyData();

      expect(telemetryAggregateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          meterId: 'METER001',
          hourStart: expect.any(Date),
          dataPointsCount: 2,
          // Energy totals should be end - start
          exportEnergyTotal: 500, // 10500 - 10000
          importEnergyTotal: 200, // 5200 - 5000
          loadSmartEnergyTotal: 500, // 20500 - 20000
          loadHomeEnergyTotal: 300, // 10300 - 10000
          solarInputEnergyTotal: 600, // 30600 - 30000
          solarOutputEnergyTotal: 800, // 40800 - 40000
        }),
      );
    });

    it('should handle MQTT disconnections in snapshots', async () => {
      const hourStart = new Date('2025-10-27T10:00:00Z');
      const mockStatus = {
        METER001: { timestamp: Date.now() },
      };

      const mockSnapshots = [
        createMockSnapshot(hourStart.getTime(), { mqttConnected: true }),
        createMockSnapshot(hourStart.getTime() + 1000000, {
          mqttConnected: false,
        }),
        createMockSnapshot(hourStart.getTime() + 2000000, {
          mqttConnected: true,
        }),
      ];

      redisTelemetryService.getAllLatestStatus.mockResolvedValue(
        mockStatus as any,
      );
      redisTelemetryService.getTimeSeriesSnapshots.mockResolvedValue(
        mockSnapshots as any,
      );
      redisTelemetryService.cleanupOldTimeSeries.mockResolvedValue(undefined);

      await service.aggregateHourlyData();

      expect(telemetryAggregateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          mqttDisconnections: 1, // One transition from connected to disconnected
        }),
      );
    });

    it('should save aggregate even with minimal data', async () => {
      const hourStart = new Date('2025-10-27T10:00:00Z');
      const mockStatus = {
        METER001: { timestamp: Date.now() },
      };

      // Single snapshot with minimal data
      const mockSnapshots = [createMockSnapshot(hourStart.getTime())];

      redisTelemetryService.getAllLatestStatus.mockResolvedValue(
        mockStatus as any,
      );
      redisTelemetryService.getTimeSeriesSnapshots.mockResolvedValue(
        mockSnapshots as any,
      );
      redisTelemetryService.cleanupOldTimeSeries.mockResolvedValue(undefined);

      await service.aggregateHourlyData();

      expect(telemetryAggregateRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          meterId: 'METER001',
          dataPointsCount: 1,
        }),
      );
    });
  });
});
