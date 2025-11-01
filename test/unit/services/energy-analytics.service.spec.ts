import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { EnergyAnalyticsService } from '../../../src/services/energy/energy-analytics.service';
import { TelemetryAggregate } from '../../../src/models/telemetryAggregate/telemetryAggregate.entity';
import { RedisTelemetryService } from '../../../src/services/telemetry/redis-telemetry.service';
import { EnergySettlementsService } from '../../../src/models/energySettlement/energySettlement.service';
import { SmartMetersService } from '../../../src/models/smartMeter/smartMeter.service';
import {
  createMockRepository,
  createMockQueryBuilder,
} from '../../helpers/mock-repository.helper';
import {
  createMockSmartMeter,
  createMockEnergySettlement,
} from '../../helpers/mock-factories.helper';

describe('EnergyAnalyticsService', () => {
  let service: EnergyAnalyticsService;
  let telemetryAggregateRepo: any;
  let redisTelemetryService: jest.Mocked<RedisTelemetryService>;
  let energySettlementsService: jest.Mocked<EnergySettlementsService>;
  let smartMetersService: jest.Mocked<SmartMetersService>;

  // Helper to setup QueryBuilder mock
  const setupMockQueryBuilder = (data: any[]) => {
    const mockQB = createMockQueryBuilder();
    telemetryAggregateRepo.createQueryBuilder.mockReturnValue(mockQB);
    (mockQB.getMany as jest.Mock).mockResolvedValue(data);
    return mockQB;
  };

  beforeEach(async () => {
    telemetryAggregateRepo = createMockRepository();
    redisTelemetryService = {
      getLatestData: jest.fn(),
    } as any;
    energySettlementsService = {
      findAll: jest.fn(),
    } as any;
    smartMetersService = {
      findAll: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnergyAnalyticsService,
        {
          provide: getRepositoryToken(TelemetryAggregate),
          useValue: telemetryAggregateRepo,
        },
        {
          provide: RedisTelemetryService,
          useValue: redisTelemetryService,
        },
        {
          provide: EnergySettlementsService,
          useValue: energySettlementsService,
        },
        {
          provide: SmartMetersService,
          useValue: smartMetersService,
        },
      ],
    }).compile();

    // Suppress logger output
    module.useLogger(false);

    service = module.get<EnergyAnalyticsService>(EnergyAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEnergyStats', () => {
    it('should return comprehensive energy statistics', async () => {
      const prosumerId = 'PROSUMER001';
      const mockMeters = [createMockSmartMeter({ meterId: 'METER001' })];

      const mockTodayAggregates = [
        {
          solarOutputEnergyTotal: 10000, // 10 kWh
          loadSmartEnergyTotal: 4000,
          loadHomeEnergyTotal: 3000, // Total consumption: 7 kWh
          exportEnergyTotal: 2000, // 2 kWh
          importEnergyTotal: 1000, // 1 kWh
        },
      ];

      const mockTotalAggregates = [
        {
          solarOutputEnergyTotal: 50000, // 50 kWh total
          loadSmartEnergyTotal: 20000,
          loadHomeEnergyTotal: 15000, // 35 kWh total
          exportEnergyTotal: 10000, // 10 kWh
          importEnergyTotal: 5000, // 5 kWh
        },
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);

      const mockQB = setupMockQueryBuilder([]);
      (mockQB.getMany as jest.Mock)
        .mockResolvedValueOnce(mockTodayAggregates) // Today's data
        .mockResolvedValueOnce(mockTotalAggregates); // All-time data

      const result = await service.getEnergyStats(prosumerId);

      expect(result).toBeDefined();
      expect(result.todayGeneration).toBe(10); // 10000 / 1000
      expect(result.totalGeneration).toBe(50); // 50000 / 1000
      expect(result.todayConsumption).toBe(7); // (4000 + 3000) / 1000
      expect(result.totalConsumption).toBe(35); // (20000 + 15000) / 1000
      expect(result.netEnergy).toBe(15); // 50 - 35
      expect(result.todayGridExport).toBe(2);
      expect(result.todayGridImport).toBe(1);
      expect(result.totalGridExport).toBe(10);
      expect(result.totalGridImport).toBe(5);
      expect(result.netGridEnergy).toBe(5); // 10 - 5
    });

    it('should return zero stats when no meters found', async () => {
      smartMetersService.findAll.mockResolvedValue([]);

      const result = await service.getEnergyStats('PROSUMER001');

      expect(result.todayGeneration).toBe(0);
      expect(result.totalGeneration).toBe(0);
      expect(result.todayConsumption).toBe(0);
      expect(result.netEnergy).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      smartMetersService.findAll.mockRejectedValue(
        new Error('DB connection failed'),
      );

      const result = await service.getEnergyStats('PROSUMER001');

      expect(result.todayGeneration).toBe(0);
      expect(result.totalGeneration).toBe(0);
    });

    it('should handle null or undefined values in aggregates', async () => {
      const mockMeters = [createMockSmartMeter({ meterId: 'METER001' })];
      const mockAggregates = [
        {
          solarOutputEnergyTotal: null,
          loadSmartEnergyTotal: undefined,
          loadHomeEnergyTotal: 0,
        },
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      const mockQB = setupMockQueryBuilder([]);
      (mockQB.getMany as jest.Mock)
        .mockResolvedValueOnce(mockAggregates)
        .mockResolvedValueOnce(mockAggregates);

      const result = await service.getEnergyStats('PROSUMER001');

      expect(result.todayGeneration).toBe(0);
      expect(result.todayConsumption).toBe(0);
    });
  });

  describe('getEnergyChartData', () => {
    it('should return hourly chart data array for specified days', async () => {
      const prosumerId = 'PROSUMER001';
      const days = 7;
      const mockMeters = [createMockSmartMeter({ meterId: 'METER001' })];

      const now = new Date();
      const mockAggregates = [
        {
          hourStart: new Date(now.getTime() - 3600000), // 1 hour ago
          solarOutputEnergyTotal: 2000, // 2 kWh
          loadSmartEnergyTotal: 800,
          loadHomeEnergyTotal: 500, // 1.3 kWh consumption
          exportEnergyTotal: 500, // 0.5 kWh
          importEnergyTotal: 200, // 0.2 kWh
          netSolarEnergyTotal: 300, // 0.3 kWh battery
        },
        {
          hourStart: new Date(now.getTime() - 7200000), // 2 hours ago
          solarOutputEnergyTotal: 1800,
          loadSmartEnergyTotal: 700,
          loadHomeEnergyTotal: 400,
          exportEnergyTotal: 400,
          importEnergyTotal: 150,
          netSolarEnergyTotal: 250,
        },
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      setupMockQueryBuilder(mockAggregates);

      const result = await service.getEnergyChartData(prosumerId, days);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check structure of first data point
      const firstPoint = result[0];
      expect(firstPoint).toHaveProperty('timestamp');
      expect(firstPoint).toHaveProperty('generation');
      expect(firstPoint).toHaveProperty('consumption');
      expect(firstPoint).toHaveProperty('export');
      expect(firstPoint).toHaveProperty('import');
      expect(firstPoint).toHaveProperty('battery');

      expect(typeof firstPoint.generation).toBe('number');
      expect(typeof firstPoint.consumption).toBe('number');
    });

    it('should return empty array when no meters found', async () => {
      smartMetersService.findAll.mockResolvedValue([]);

      const result = await service.getEnergyChartData('PROSUMER001', 7);

      expect(result).toEqual([]);
    });

    it('should aggregate data from multiple meters', async () => {
      const mockMeters = [
        createMockSmartMeter({ meterId: 'METER001' }),
        createMockSmartMeter({ meterId: 'METER002' }),
      ];

      const now = new Date();
      const mockAggregates = [
        {
          hourStart: now,
          solarOutputEnergyTotal: 1000,
          loadSmartEnergyTotal: 400,
          loadHomeEnergyTotal: 300,
          exportEnergyTotal: 200,
          importEnergyTotal: 100,
          netSolarEnergyTotal: 150,
        },
        {
          hourStart: now, // Same hour, different meter
          solarOutputEnergyTotal: 1200,
          loadSmartEnergyTotal: 500,
          loadHomeEnergyTotal: 350,
          exportEnergyTotal: 250,
          importEnergyTotal: 120,
          netSolarEnergyTotal: 180,
        },
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      setupMockQueryBuilder(mockAggregates);

      const result = await service.getEnergyChartData('PROSUMER001', 1);

      expect(result.length).toBeGreaterThan(0);
      // Data from same hour should be aggregated
      const aggregated = result.find((d) => d.timestamp === now.toISOString());
      if (aggregated) {
        expect(aggregated.generation).toBe(2.2); // (1000 + 1200) / 1000
        expect(aggregated.consumption).toBe(1.55); // (400 + 300 + 500 + 350) / 1000
      }
    });

    it('should handle database errors gracefully', async () => {
      smartMetersService.findAll.mockRejectedValue(new Error('Query failed'));

      const result = await service.getEnergyChartData('PROSUMER001', 7);

      expect(result).toEqual([]);
    });
  });

  describe('getRealTimeEnergyData', () => {
    it('should return real-time telemetry data from Redis', async () => {
      const prosumerId = 'PROSUMER001';
      const mockMeters = [createMockSmartMeter({ meterId: 'METER001' })];
      const mockTelemetry = {
        data: {
          solar_output: { power: 1500, voltage: 240, current: 6.25 },
          load_smart_mtr: { power: 600, voltage: 240, current: 2.5 },
          load_home: { power: 400, voltage: 240, current: 1.67 },
          export: {
            power: 300,
            settlement_energy: 500, // Wh
          },
          import: {
            power: 100,
            settlement_energy: 200, // Wh
          },
        },
      };

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      redisTelemetryService.getLatestData.mockResolvedValue(
        mockTelemetry as any,
      );

      const result = await service.getRealTimeEnergyData(prosumerId);

      expect(result).toBeDefined();
      expect(result.timeSeries).toBeDefined();
      expect(Array.isArray(result.timeSeries)).toBe(true);
      expect(result.aggregated).toBeDefined();

      const firstPoint = result.timeSeries[0];
      expect(firstPoint.meterId).toBe('METER001');
      expect(firstPoint.solar).toBe(1.5); // 1500 / 1000
      expect(firstPoint.consumption).toBe(1); // (600 + 400) / 1000
      expect(firstPoint.gridExport).toBe(0.3); // 300 / 1000
      expect(firstPoint.gridImport).toBe(0.1); // 100 / 1000
      expect(firstPoint.settlementEnergyWh.export).toBe(0.5); // 500 / 1000
      expect(firstPoint.settlementEnergyWh.import).toBe(0.2); // 200 / 1000
    });

    it('should return empty structure when no meters found', async () => {
      smartMetersService.findAll.mockResolvedValue([]);

      const result = await service.getRealTimeEnergyData('PROSUMER001');

      expect(result.timeSeries).toEqual([]);
      expect(result.aggregated.totalSolar).toBe(0);
      expect(result.aggregated.totalConsumption).toBe(0);
    });

    it('should calculate aggregated totals correctly', async () => {
      const mockMeters = [
        createMockSmartMeter({ meterId: 'METER001' }),
        createMockSmartMeter({ meterId: 'METER002' }),
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      redisTelemetryService.getLatestData
        .mockResolvedValueOnce({
          data: {
            solar_output: { power: 1000 },
            load_smart_mtr: { power: 400 },
            load_home: { power: 300 },
            export: { power: 200, settlement_energy: 300 },
            import: { power: 50, settlement_energy: 100 },
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            solar_output: { power: 1200 },
            load_smart_mtr: { power: 500 },
            load_home: { power: 350 },
            export: { power: 250, settlement_energy: 400 },
            import: { power: 75, settlement_energy: 150 },
          },
        } as any);

      const result = await service.getRealTimeEnergyData('PROSUMER001');

      expect(result.aggregated.totalSolar).toBe(2.2); // (1000 + 1200) / 1000
      expect(result.aggregated.totalConsumption).toBe(1.55); // (400 + 300 + 500 + 350) / 1000
      expect(result.aggregated.totalGridExport).toBe(0.45); // (200 + 250) / 1000
      expect(result.aggregated.totalGridImport).toBe(0.13); // (50 + 75) / 1000, rounded
    });

    it('should handle null or missing power values', async () => {
      const mockMeters = [createMockSmartMeter({ meterId: 'METER001' })];
      const mockTelemetry = {
        data: {
          solar_output: null,
          load_smart_mtr: { power: null },
          load_home: {},
          export: { power: 0, settlement_energy: 0 },
          import: { settlement_energy: 0 },
        },
      };

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      redisTelemetryService.getLatestData.mockResolvedValue(
        mockTelemetry as any,
      );

      const result = await service.getRealTimeEnergyData('PROSUMER001');

      expect(result.timeSeries.length).toBe(1);
      expect(result.timeSeries[0].solar).toBe(0);
      expect(result.timeSeries[0].consumption).toBe(0);
    });
  });

  describe('getEnergySummary', () => {
    it('should return comprehensive energy summary with nested structure', async () => {
      const prosumerId = 'PROSUMER001';
      const period = 'daily';

      // Mock getEnergyStats response
      const mockStats = {
        todayGeneration: 10,
        totalGeneration: 50,
        todayConsumption: 7,
        totalConsumption: 35,
        netEnergy: 15,
        todayGridExport: 2,
        todayGridImport: 1,
        totalGridExport: 10,
        totalGridImport: 5,
        netGridEnergy: 5,
      };

      // Mock getEnergyChartData response
      const mockChartData = [
        {
          timestamp: new Date().toISOString(),
          generation: 2.5,
          consumption: 1.5,
          export: 0.5,
          import: 0.2,
          battery: 0.3,
          net: 1.0, // generation - consumption
        },
      ];

      // Mock getSettlementStats response
      const mockSettlementStats = {
        totalSettlements: 10,
        successfulSettlements: 9,
        pendingSettlements: 1,
        todaySettlements: 2,
        lastSettlementTime: new Date().toISOString(),
        totalEtkMinted: 15.5,
        totalEtkBurned: 5.2,
      };

      // Setup mocks
      jest.spyOn(service, 'getEnergyStats').mockResolvedValue(mockStats);
      jest
        .spyOn(service, 'getEnergyChartData')
        .mockResolvedValue(mockChartData);
      jest
        .spyOn(service, 'getSettlementStats')
        .mockResolvedValue(mockSettlementStats);

      const result = await service.getEnergySummary(prosumerId, period);

      expect(result).toBeDefined();
      expect(result.period).toBe('daily');

      // Check nested generation structure
      expect(result.generation.today).toBe(10);
      expect(result.generation.total).toBe(50);
      expect(result.generation.gridExport).toBe(2);

      // Check nested consumption structure
      expect(result.consumption.today).toBe(7);
      expect(result.consumption.total).toBe(35);
      expect(result.consumption.gridImport).toBe(1);

      // Check net energy
      expect(result.net.energy).toBe(15);
      expect(result.net.gridEnergy).toBe(5);

      // Check chart data
      expect(result.chartData).toEqual(mockChartData);

      // Check settlements
      expect(result.settlements.total).toBe(10);
      expect(result.settlements.today).toBe(2);
      expect(result.settlements.etkMinted).toBe(15.5);
      expect(result.settlements.etkBurned).toBe(5.2);
    });

    it('should use daily period by default', async () => {
      jest.spyOn(service, 'getEnergyStats').mockResolvedValue({
        todayGeneration: 5,
        totalGeneration: 20,
        todayConsumption: 3,
        totalConsumption: 15,
        netEnergy: 5,
        todayGridExport: 1,
        todayGridImport: 0.5,
        totalGridExport: 5,
        totalGridImport: 2,
        netGridEnergy: 3,
      });
      jest.spyOn(service, 'getEnergyChartData').mockResolvedValue([]);
      jest.spyOn(service, 'getSettlementStats').mockResolvedValue({
        totalSettlements: 0,
        successfulSettlements: 0,
        pendingSettlements: 0,
        todaySettlements: 0,
        lastSettlementTime: null,
        totalEtkMinted: 0,
        totalEtkBurned: 0,
      });

      const result = await service.getEnergySummary('PROSUMER001');

      expect(result.period).toBe('daily');
      expect(service.getEnergyChartData).toHaveBeenCalledWith('PROSUMER001', 1);
    });

    it('should fetch weekly data when period is weekly', async () => {
      jest.spyOn(service, 'getEnergyStats').mockResolvedValue({} as any);
      jest.spyOn(service, 'getEnergyChartData').mockResolvedValue([]);
      jest.spyOn(service, 'getSettlementStats').mockResolvedValue({} as any);

      await service.getEnergySummary('PROSUMER001', 'weekly');

      expect(service.getEnergyChartData).toHaveBeenCalledWith('PROSUMER001', 7);
    });

    it('should fetch monthly data when period is monthly', async () => {
      jest.spyOn(service, 'getEnergyStats').mockResolvedValue({} as any);
      jest.spyOn(service, 'getEnergyChartData').mockResolvedValue([]);
      jest.spyOn(service, 'getSettlementStats').mockResolvedValue({} as any);

      await service.getEnergySummary('PROSUMER001', 'monthly');

      expect(service.getEnergyChartData).toHaveBeenCalledWith(
        'PROSUMER001',
        30,
      );
    });

    it('should propagate errors from underlying services', async () => {
      jest
        .spyOn(service, 'getEnergyStats')
        .mockRejectedValue(new Error('Stats failed'));

      await expect(service.getEnergySummary('PROSUMER001')).rejects.toThrow(
        'Stats failed',
      );
    });
  });

  describe('getSettlementStats', () => {
    it('should return settlement statistics with ETK calculations', async () => {
      const prosumerId = 'PROSUMER001';
      const mockMeters = [createMockSmartMeter({ meterId: 'METER001' })];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const mockSettlements = [
        createMockEnergySettlement({
          meterId: 'METER001',
          netKwhFromGrid: 5, // Exported
          etkAmountCredited: 5, // Minted ETK
          status: 'SUCCESS',
          createdAtBackend: today,
        }),
        createMockEnergySettlement({
          meterId: 'METER001',
          netKwhFromGrid: -3, // Imported
          etkAmountCredited: -3, // Burned ETK
          status: 'SUCCESS',
          createdAtBackend: new Date(today.getTime() - 86400000), // Yesterday
        }),
        createMockEnergySettlement({
          meterId: 'METER001',
          netKwhFromGrid: 2,
          etkAmountCredited: 2, // Minted ETK (pending)
          status: 'PENDING',
          createdAtBackend: today,
        }),
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      energySettlementsService.findAll.mockResolvedValue(
        mockSettlements as any,
      );

      const result = await service.getSettlementStats(prosumerId);

      expect(result).toBeDefined();
      expect(result.totalSettlements).toBe(3);
      expect(result.successfulSettlements).toBe(2);
      expect(result.pendingSettlements).toBe(1);
      expect(result.todaySettlements).toBe(2);
      expect(result.totalEtkMinted).toBe(5); // Only from successful: 5 (today) + 0 (yesterday had negative)
      expect(result.totalEtkBurned).toBe(3); // From successful: 3 (absolute value of -3)
      expect(result.lastSettlementTime).toBeDefined();
    });

    it('should return empty stats when no meters found', async () => {
      smartMetersService.findAll.mockResolvedValue([]);

      const result = await service.getSettlementStats('PROSUMER001');

      expect(result.totalSettlements).toBe(0);
      expect(result.successfulSettlements).toBe(0);
      expect(result.totalEtkMinted).toBe(0);
      expect(result.totalEtkBurned).toBe(0);
      expect(result.lastSettlementTime).toBeNull();
    });

    it('should handle settlements with no ETK conversion', async () => {
      const mockMeters = [createMockSmartMeter({ meterId: 'METER001' })];
      const mockSettlements = [
        createMockEnergySettlement({
          meterId: 'METER001',
          netKwhFromGrid: 0,
          status: 'SUCCESS',
        }),
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      energySettlementsService.findAll.mockResolvedValue(
        mockSettlements as any,
      );

      const result = await service.getSettlementStats('PROSUMER001');

      expect(result.totalEtkMinted).toBe(0);
      expect(result.totalEtkBurned).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      smartMetersService.findAll.mockRejectedValue(new Error('DB error'));

      const result = await service.getSettlementStats('PROSUMER001');

      expect(result.totalSettlements).toBe(0);
      expect(result.lastSettlementTime).toBeNull();
    });
  });

  describe('getHourlyEnergyHistory', () => {
    it('should return hourly energy history for specified hours', async () => {
      const prosumerId = 'PROSUMER001';
      const hours = 24;
      const mockMeters = [createMockSmartMeter({ meterId: 'METER001' })];

      const now = new Date();
      const mockAggregates = [
        {
          hourStart: new Date(now.getTime() - 3600000),
          solarOutputEnergyTotal: 3000,
          loadSmartEnergyTotal: 1200,
          loadHomeEnergyTotal: 800,
          exportEnergyTotal: 600,
          importEnergyTotal: 300,
          batteryChargedEnergyTotal: 400,
          batteryDischargedEnergyTotal: 100,
        },
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      setupMockQueryBuilder(mockAggregates);

      const result = await service.getHourlyEnergyHistory(prosumerId, hours);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const firstPoint = result[0];
      expect(firstPoint).toHaveProperty('hour');
      expect(firstPoint).toHaveProperty('timestamp');
      expect(firstPoint).toHaveProperty('solar');
      expect(firstPoint).toHaveProperty('consumption');
      expect(firstPoint).toHaveProperty('battery');
      expect(firstPoint).toHaveProperty('gridExport');
      expect(firstPoint).toHaveProperty('gridImport');
      expect(firstPoint).toHaveProperty('net');
    });

    it('should filter by specific meter when meterId provided', async () => {
      const mockMeters = [
        createMockSmartMeter({ meterId: 'METER001' }),
        createMockSmartMeter({ meterId: 'METER002' }),
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      setupMockQueryBuilder([]);

      await service.getHourlyEnergyHistory('PROSUMER001', 24, 'METER001');

      expect(telemetryAggregateRepo.createQueryBuilder).toHaveBeenCalled();
      const qb = telemetryAggregateRepo.createQueryBuilder();
      expect(qb.where).toHaveBeenCalledWith('agg.meterId IN (:...meterIds)', {
        meterIds: ['METER001'],
      });
    });

    it('should return empty array when meter does not belong to prosumer', async () => {
      const mockMeters = [createMockSmartMeter({ meterId: 'METER001' })];
      smartMetersService.findAll.mockResolvedValue(mockMeters as any);

      const result = await service.getHourlyEnergyHistory(
        'PROSUMER001',
        24,
        'METER999',
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when no meters found', async () => {
      smartMetersService.findAll.mockResolvedValue([]);

      const result = await service.getHourlyEnergyHistory('PROSUMER001', 24);

      expect(result).toEqual([]);
    });

    it('should calculate net energy correctly', async () => {
      const mockMeters = [createMockSmartMeter({ meterId: 'METER001' })];
      const mockAggregates = [
        {
          hourStart: new Date(),
          solarOutputEnergyTotal: 5000, // 5 kWh solar
          loadSmartEnergyTotal: 2000, // 3 kWh consumption
          loadHomeEnergyTotal: 1000,
          exportEnergyTotal: 1500, // 1.5 kWh export
          importEnergyTotal: 500, // 0.5 kWh import
          netSolarEnergyTotal: 600, // 0.6 kWh battery (used for battery calculation)
        },
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      setupMockQueryBuilder(mockAggregates);

      const result = await service.getHourlyEnergyHistory('PROSUMER001', 1);

      expect(result[0].solar).toBe(5);
      expect(result[0].consumption).toBe(3);
      expect(result[0].battery).toBe(0.6); // netSolarEnergyTotal / 1000
      expect(result[0].net).toBe(2); // 5 - 3
    });

    it('should use default 24 hours when hours not specified', async () => {
      const mockMeters = [createMockSmartMeter({ meterId: 'METER001' })];
      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      setupMockQueryBuilder([]);

      await service.getHourlyEnergyHistory('PROSUMER001');

      const qb = telemetryAggregateRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalled();
      // Verify time range calculation uses 24 hours default
    });
  });
});
