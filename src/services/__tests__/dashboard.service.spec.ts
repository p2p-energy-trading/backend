import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DashboardService } from '../dashboard.service';
import { EnergyReadingsService } from '../../graphql/EnergyReadings/EnergyReadings.service';
import { EnergySettlementsService } from '../../graphql/EnergySettlements/EnergySettlements.service';
import { MarketTradesService } from '../../graphql/MarketTrades/MarketTrades.service';
import { SmartMetersService } from '../../graphql/SmartMeters/SmartMeters.service';
import { WalletsService } from '../../graphql/Wallets/Wallets.service';
import { BlockchainService } from '../blockchain.service';
import {
  createMockEnergyReading,
  createMockEnergySettlement,
  createMockMarketTrade,
  createMockSmartMeter,
  createMockWallet,
} from '../../test-setup';

describe('DashboardService', () => {
  let service: DashboardService;
  let module: TestingModule;
  let energyReadingsService: jest.Mocked<EnergyReadingsService>;
  let energySettlementsService: jest.Mocked<EnergySettlementsService>;
  let marketTradesService: jest.Mocked<MarketTradesService>;
  let smartMetersService: jest.Mocked<SmartMetersService>;
  let walletsService: jest.Mocked<WalletsService>;
  let blockchainService: jest.Mocked<BlockchainService>;

  beforeEach(async () => {
    const mockEnergyReadingsService = {
      findByDateRange: jest.fn(),
      findBySmartMeterAndDateRange: jest.fn(),
      getTodayStats: jest.fn(),
      getTotalStats: jest.fn(),
      getRecentReadings: jest.fn(),
      getAggregatedData: jest.fn(),
    };

    const mockEnergySettlementsService = {
      findByUserId: jest.fn(),
      findByDateRange: jest.fn(),
      getTotalSettlements: jest.fn(),
      getSettlementStats: jest.fn(),
    };

    const mockMarketTradesService = {
      findByUserId: jest.fn(),
      findByDateRange: jest.fn(),
      getTradingStats: jest.fn(),
      getRecentTrades: jest.fn(),
      getTotalVolume: jest.fn(),
    };

    const mockSmartMetersService = {
      findByUserId: jest.fn(),
      countByUserId: jest.fn(),
      getDeviceStatus: jest.fn(),
      findActiveDevices: jest.fn(),
    };

    const mockWalletsService = {
      findByUserId: jest.fn(),
      getBalances: jest.fn(),
      updateBalance: jest.fn(),
    };

    const mockBlockchainService = {
      getTokenBalance: jest.fn(),
      getNetworkInfo: jest.fn(),
      getAllowance: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: EnergyReadingsService, useValue: mockEnergyReadingsService },
        {
          provide: EnergySettlementsService,
          useValue: mockEnergySettlementsService,
        },
        { provide: MarketTradesService, useValue: mockMarketTradesService },
        { provide: SmartMetersService, useValue: mockSmartMetersService },
        { provide: WalletsService, useValue: mockWalletsService },
        { provide: BlockchainService, useValue: mockBlockchainService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    energyReadingsService = module.get(EnergyReadingsService);
    energySettlementsService = module.get(EnergySettlementsService);
    marketTradesService = module.get(MarketTradesService);
    smartMetersService = module.get(SmartMetersService);
    walletsService = module.get(WalletsService);
    blockchainService = module.get(BlockchainService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getDashboardStats', () => {
    const prosumerId = '1';
    const mockDevices = [
      createMockSmartMeter({ id: 1, userId: 1, serialNumber: 'SM001' }),
      createMockSmartMeter({ id: 2, userId: 1, serialNumber: 'SM002' }),
    ];
    const mockWallet = createMockWallet({ id: 1, userId: 1, address: '0x123' });

    beforeEach(() => {
      smartMetersService.findByUserId.mockResolvedValue(mockDevices);
      walletsService.findByUserId.mockResolvedValue(mockWallet);
    });

    it('should return complete dashboard stats', async () => {
      // Mock energy stats
      energyReadingsService.getTodayStats.mockResolvedValue({
        totalGeneration: 1500,
        totalConsumption: 1200,
        netEnergy: 300,
      });

      energyReadingsService.getTotalStats.mockResolvedValue({
        totalGeneration: 50000,
        totalConsumption: 45000,
        netEnergy: 5000,
      });

      // Mock trading stats
      marketTradesService.getTradingStats.mockResolvedValue({
        totalTrades: 25,
        totalVolume: 10000,
        averagePrice: 0.15,
        last24hVolume: 1500,
      });

      // Mock blockchain balances
      blockchainService.getTokenBalance
        .mockResolvedValueOnce('1000000000000000000') // ETK
        .mockResolvedValueOnce('5000000000000000000'); // IDRS

      // Mock device status
      smartMetersService.getDeviceStatus.mockResolvedValue({
        totalDevices: 2,
        onlineDevices: 2,
        lastHeartbeat: '2025-06-14T10:30:00Z',
      });

      const result = await service.getDashboardStats(prosumerId);

      expect(result).toEqual({
        energyStats: {
          todayGeneration: 1500,
          todayConsumption: 1200,
          totalGeneration: 50000,
          totalConsumption: 45000,
          netEnergy: 300,
        },
        tradingStats: {
          totalTrades: 25,
          totalVolume: 10000,
          averagePrice: 0.15,
          last24hVolume: 1500,
        },
        balances: {
          ETH: 0, // Mocked as 0 for test
          ETK: 1,
          IDRS: 5,
        },
        deviceStatus: {
          totalDevices: 2,
          onlineDevices: 2,
          lastHeartbeat: '2025-06-14T10:30:00Z',
        },
      });

      expect(smartMetersService.findByUserId).toHaveBeenCalledWith(
        parseInt(prosumerId),
      );
      expect(walletsService.findByUserId).toHaveBeenCalledWith(
        parseInt(prosumerId),
      );
      expect(blockchainService.getTokenBalance).toHaveBeenCalledTimes(2);
    });

    it('should handle missing wallet gracefully', async () => {
      walletsService.findByUserId.mockResolvedValue(null);

      energyReadingsService.getTodayStats.mockResolvedValue({
        totalGeneration: 1500,
        totalConsumption: 1200,
        netEnergy: 300,
      });

      energyReadingsService.getTotalStats.mockResolvedValue({
        totalGeneration: 50000,
        totalConsumption: 45000,
        netEnergy: 5000,
      });

      marketTradesService.getTradingStats.mockResolvedValue({
        totalTrades: 0,
        totalVolume: 0,
        averagePrice: 0,
        last24hVolume: 0,
      });

      smartMetersService.getDeviceStatus.mockResolvedValue({
        totalDevices: 2,
        onlineDevices: 1,
        lastHeartbeat: '2025-06-14T10:30:00Z',
      });

      const result = await service.getDashboardStats(prosumerId);

      expect(result.balances).toEqual({
        ETH: 0,
        ETK: 0,
        IDRS: 0,
      });
    });

    it('should handle blockchain service errors', async () => {
      energyReadingsService.getTodayStats.mockResolvedValue({
        totalGeneration: 1500,
        totalConsumption: 1200,
        netEnergy: 300,
      });

      energyReadingsService.getTotalStats.mockResolvedValue({
        totalGeneration: 50000,
        totalConsumption: 45000,
        netEnergy: 5000,
      });

      marketTradesService.getTradingStats.mockResolvedValue({
        totalTrades: 25,
        totalVolume: 10000,
        averagePrice: 0.15,
        last24hVolume: 1500,
      });

      smartMetersService.getDeviceStatus.mockResolvedValue({
        totalDevices: 2,
        onlineDevices: 2,
        lastHeartbeat: '2025-06-14T10:30:00Z',
      });

      blockchainService.getTokenBalance.mockRejectedValue(
        new Error('Blockchain error'),
      );

      const result = await service.getDashboardStats(prosumerId);

      expect(result.balances).toEqual({
        ETH: 0,
        ETK: 0,
        IDRS: 0,
      });
    });
  });

  describe('getEnergyChartData', () => {
    it('should return energy chart data for specified period', async () => {
      const prosumerId = '1';
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-14');

      const mockReadings = [
        createMockEnergyReading({
          timestamp: new Date('2025-06-01T12:00:00Z'),
          exportEnergyWh: 2000,
          importEnergyWh: 1500,
        }),
        createMockEnergyReading({
          timestamp: new Date('2025-06-02T12:00:00Z'),
          exportEnergyWh: 2200,
          importEnergyWh: 1300,
        }),
      ];

      smartMetersService.findByUserId.mockResolvedValue([
        createMockSmartMeter({ id: 1, userId: 1 }),
      ]);

      energyReadingsService.getAggregatedData.mockResolvedValue({
        daily: [
          { date: '2025-06-01', generation: 2000, consumption: 1500, net: 500 },
          { date: '2025-06-02', generation: 2200, consumption: 1300, net: 900 },
        ],
        hourly: [],
      });

      const result = await service.getEnergyChartData(
        prosumerId,
        'daily',
        startDate,
        endDate,
      );

      expect(result).toEqual({
        labels: ['2025-06-01', '2025-06-02'],
        datasets: [
          {
            label: 'Generation',
            data: [2000, 2200],
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
          },
          {
            label: 'Consumption',
            data: [1500, 1300],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
          },
          {
            label: 'Net Energy',
            data: [500, 900],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
        ],
      });

      expect(energyReadingsService.getAggregatedData).toHaveBeenCalledWith(
        [1],
        'daily',
        startDate,
        endDate,
      );
    });

    it('should handle empty energy data', async () => {
      const prosumerId = '1';
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-14');

      smartMetersService.findByUserId.mockResolvedValue([]);
      energyReadingsService.getAggregatedData.mockResolvedValue({
        daily: [],
        hourly: [],
      });

      const result = await service.getEnergyChartData(
        prosumerId,
        'daily',
        startDate,
        endDate,
      );

      expect(result).toEqual({
        labels: [],
        datasets: [
          {
            label: 'Generation',
            data: [],
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
          },
          {
            label: 'Consumption',
            data: [],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
          },
          {
            label: 'Net Energy',
            data: [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
        ],
      });
    });
  });

  describe('getTradingChartData', () => {
    it('should return trading chart data', async () => {
      const prosumerId = '1';
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-14');

      const mockTrades = [
        createMockMarketTrade({
          timestamp: new Date('2025-06-01T12:00:00Z'),
          quantity: 1000,
          price: '0.15',
        }),
        createMockMarketTrade({
          timestamp: new Date('2025-06-02T12:00:00Z'),
          quantity: 1500,
          price: '0.16',
        }),
      ];

      marketTradesService.findByDateRange.mockResolvedValue(mockTrades);

      const result = await service.getTradingChartData(
        prosumerId,
        startDate,
        endDate,
      );

      expect(result).toEqual({
        labels: expect.any(Array),
        datasets: [
          {
            label: 'Trade Volume',
            data: expect.any(Array),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
          },
          {
            label: 'Average Price',
            data: expect.any(Array),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            yAxisID: 'price',
          },
        ],
      });

      expect(marketTradesService.findByDateRange).toHaveBeenCalledWith(
        parseInt(prosumerId),
        startDate,
        endDate,
      );
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent activity summary', async () => {
      const prosumerId = '1';
      const limit = 10;

      const mockRecentTrades = [
        createMockMarketTrade({
          id: 1,
          timestamp: new Date('2025-06-14T10:00:00Z'),
          quantity: 1000,
          price: '0.15',
        }),
      ];

      const mockRecentSettlements = [
        createMockEnergySettlement({
          id: 1,
          timestamp: new Date('2025-06-14T09:00:00Z'),
          netEnergyWh: 2000,
          settlementType: 'EXPORT',
        }),
      ];

      marketTradesService.getRecentTrades.mockResolvedValue(mockRecentTrades);
      energySettlementsService.findByUserId.mockResolvedValue(
        mockRecentSettlements,
      );

      const result = await service.getRecentActivity(prosumerId, limit);

      expect(result).toEqual({
        trades: mockRecentTrades,
        settlements: mockRecentSettlements,
        totalActivities: 2,
      });

      expect(marketTradesService.getRecentTrades).toHaveBeenCalledWith(
        parseInt(prosumerId),
        limit,
      );
      expect(energySettlementsService.findByUserId).toHaveBeenCalledWith(
        parseInt(prosumerId),
        limit,
        0,
      );
    });
  });

  describe('getDeviceHealthSummary', () => {
    it('should return device health summary', async () => {
      const prosumerId = '1';

      const mockDevices = [
        createMockSmartMeter({
          id: 1,
          serialNumber: 'SM001',
          status: 'ACTIVE',
          lastHeartbeat: new Date('2025-06-14T10:30:00Z'),
        }),
        createMockSmartMeter({
          id: 2,
          serialNumber: 'SM002',
          status: 'OFFLINE',
          lastHeartbeat: new Date('2025-06-14T08:00:00Z'),
        }),
      ];

      smartMetersService.findByUserId.mockResolvedValue(mockDevices);

      const result = await service.getDeviceHealthSummary(prosumerId);

      expect(result).toEqual({
        totalDevices: 2,
        healthyDevices: 1,
        offlineDevices: 1,
        warningDevices: 0,
        devices: [
          {
            id: 1,
            serialNumber: 'SM001',
            status: 'HEALTHY',
            lastSeen: expect.any(Date),
            alerts: [],
          },
          {
            id: 2,
            serialNumber: 'SM002',
            status: 'OFFLINE',
            lastSeen: expect.any(Date),
            alerts: ['Device has been offline for more than 1 hour'],
          },
        ],
      });

      expect(smartMetersService.findByUserId).toHaveBeenCalledWith(
        parseInt(prosumerId),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully in getDashboardStats', async () => {
      const prosumerId = '1';

      smartMetersService.findByUserId.mockRejectedValue(
        new Error('Database error'),
      );
      walletsService.findByUserId.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getDashboardStats(prosumerId)).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle partial data failures', async () => {
      const prosumerId = '1';

      smartMetersService.findByUserId.mockResolvedValue([]);
      walletsService.findByUserId.mockResolvedValue(null);
      energyReadingsService.getTodayStats.mockRejectedValue(
        new Error('Service error'),
      );
      energyReadingsService.getTotalStats.mockResolvedValue({
        totalGeneration: 0,
        totalConsumption: 0,
        netEnergy: 0,
      });
      marketTradesService.getTradingStats.mockResolvedValue({
        totalTrades: 0,
        totalVolume: 0,
        averagePrice: 0,
        last24hVolume: 0,
      });
      smartMetersService.getDeviceStatus.mockResolvedValue({
        totalDevices: 0,
        onlineDevices: 0,
        lastHeartbeat: null,
      });

      const result = await service.getDashboardStats(prosumerId);

      expect(result.energyStats.todayGeneration).toBe(0);
      expect(result.energyStats.todayConsumption).toBe(0);
    });
  });

  describe('Data Aggregation', () => {
    it('should correctly aggregate energy data by hour', async () => {
      const prosumerId = '1';
      const startDate = new Date('2025-06-14T00:00:00Z');
      const endDate = new Date('2025-06-14T23:59:59Z');

      smartMetersService.findByUserId.mockResolvedValue([
        createMockSmartMeter({ id: 1, userId: 1 }),
      ]);

      energyReadingsService.getAggregatedData.mockResolvedValue({
        daily: [],
        hourly: [
          { hour: '00', generation: 100, consumption: 80, net: 20 },
          { hour: '01', generation: 120, consumption: 90, net: 30 },
          { hour: '02', generation: 110, consumption: 85, net: 25 },
        ],
      });

      const result = await service.getEnergyChartData(
        prosumerId,
        'hourly',
        startDate,
        endDate,
      );

      expect(result.labels).toEqual(['00', '01', '02']);
      expect(result.datasets[0].data).toEqual([100, 120, 110]); // Generation
      expect(result.datasets[1].data).toEqual([80, 90, 85]); // Consumption
      expect(result.datasets[2].data).toEqual([20, 30, 25]); // Net Energy
    });

    it('should handle different time periods correctly', async () => {
      const prosumerId = '1';
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-07');

      smartMetersService.findByUserId.mockResolvedValue([
        createMockSmartMeter({ id: 1, userId: 1 }),
      ]);

      energyReadingsService.getAggregatedData.mockResolvedValue({
        daily: [
          { date: '2025-06-01', generation: 2000, consumption: 1500, net: 500 },
          { date: '2025-06-02', generation: 2200, consumption: 1300, net: 900 },
        ],
        hourly: [],
      });

      const result = await service.getEnergyChartData(
        prosumerId,
        'daily',
        startDate,
        endDate,
      );

      expect(result.labels).toHaveLength(2);
      expect(result.datasets[0].data).toEqual([2000, 2200]);
    });
  });
});
