import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { EnergySettlementService } from '../energy-settlement.service';
import { EnergySettlementsService } from '../../graphql/EnergySettlements/EnergySettlements.service';
import { SmartMetersService } from '../../graphql/SmartMeters/SmartMeters.service';
import { EnergyReadingsService } from '../../graphql/EnergyReadings/EnergyReadings.service';
import { BlockchainService } from '../blockchain.service';
import { MqttService } from '../mqtt.service';
import { TransactionLogsService } from '../../graphql/TransactionLogs/TransactionLogs.service';
import {
  SettlementTrigger,
  TransactionType,
  TransactionStatus,
} from '../../common/enums';
import {
  createMockEnergyReading,
  createMockSmartMeter,
  createMockEnergySettlement,
} from '../../test-setup';

describe('EnergySettlementService', () => {
  let service: EnergySettlementService;
  let module: TestingModule;
  let configService: jest.Mocked<ConfigService>;
  let energySettlementsService: jest.Mocked<EnergySettlementsService>;
  let smartMetersService: jest.Mocked<SmartMetersService>;
  let energyReadingsService: jest.Mocked<EnergyReadingsService>;
  let blockchainService: jest.Mocked<BlockchainService>;
  let mqttService: jest.Mocked<MqttService>;
  let transactionLogsService: jest.Mocked<TransactionLogsService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config = {
          AUTO_SETTLEMENT_ENABLED: 'true',
          SETTLEMENT_INTERVAL_MINUTES: '5',
          MIN_SETTLEMENT_AMOUNT: '1000',
          MAX_SETTLEMENT_AMOUNT: '50000',
        };
        return config[key];
      }),
    };

    const mockEnergySettlementsService = {
      create: jest.fn(),
      findBySmartMeterId: jest.fn(),
      findPendingSettlements: jest.fn(),
      update: jest.fn(),
      findByDateRange: jest.fn(),
    };

    const mockSmartMetersService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      updateLastSettlement: jest.fn(),
    };

    const mockEnergyReadingsService = {
      findBySmartMeterAndTimeRange: jest.fn(),
      findLatestBySmartMeter: jest.fn(),
      getAggregatedReadings: jest.fn(),
    };

    const mockBlockchainService = {
      convertEnergyToTokens: jest.fn(),
      burnTokensForEnergy: jest.fn(),
      getNetworkInfo: jest.fn(),
    };

    const mockMqttService = {
      publishDeviceCommand: jest.fn(),
      publishNotification: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
    };

    const mockTransactionLogsService = {
      create: jest.fn(),
      findByType: jest.fn(),
      updateStatus: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        EnergySettlementService,
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: EnergySettlementsService,
          useValue: mockEnergySettlementsService,
        },
        { provide: SmartMetersService, useValue: mockSmartMetersService },
        { provide: EnergyReadingsService, useValue: mockEnergyReadingsService },
        { provide: BlockchainService, useValue: mockBlockchainService },
        { provide: MqttService, useValue: mockMqttService },
        {
          provide: TransactionLogsService,
          useValue: mockTransactionLogsService,
        },
      ],
    }).compile();

    service = module.get<EnergySettlementService>(EnergySettlementService);
    configService = module.get(ConfigService);
    energySettlementsService = module.get(EnergySettlementsService);
    smartMetersService = module.get(SmartMetersService);
    energyReadingsService = module.get(EnergyReadingsService);
    blockchainService = module.get(BlockchainService);
    mqttService = module.get(MqttService);
    transactionLogsService = module.get(TransactionLogsService);

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

  describe('periodicSettlement', () => {
    it('should run periodic settlement when enabled', async () => {
      const mockMeters = [
        createMockSmartMeter({ id: 1, serialNumber: 'SM001' }),
        createMockSmartMeter({ id: 2, serialNumber: 'SM002' }),
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters);
      jest.spyOn(service, 'processSmartMeterSettlement').mockResolvedValue();

      await service.periodicSettlement();

      expect(smartMetersService.findAll).toHaveBeenCalled();
    });

    it('should skip periodic settlement when disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'AUTO_SETTLEMENT_ENABLED') return 'false';
        return undefined;
      });

      const spy = jest.spyOn(service, 'processAllMetersSettlement');

      await service.periodicSettlement();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('processAllMetersSettlement', () => {
    it('should process settlement for all smart meters', async () => {
      const mockMeters = [
        createMockSmartMeter({ id: 1, serialNumber: 'SM001' }),
        createMockSmartMeter({ id: 2, serialNumber: 'SM002' }),
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters);
      jest.spyOn(service, 'processSmartMeterSettlement').mockResolvedValue();

      await service.processAllMetersSettlement(SettlementTrigger.PERIODIC);

      expect(smartMetersService.findAll).toHaveBeenCalled();
      expect(service.processSmartMeterSettlement).toHaveBeenCalledTimes(2);
      expect(service.processSmartMeterSettlement).toHaveBeenCalledWith(
        1,
        SettlementTrigger.PERIODIC,
      );
      expect(service.processSmartMeterSettlement).toHaveBeenCalledWith(
        2,
        SettlementTrigger.PERIODIC,
      );
    });

    it('should handle errors gracefully when processing meters', async () => {
      const mockMeters = [
        createMockSmartMeter({ id: 1, serialNumber: 'SM001' }),
        createMockSmartMeter({ id: 2, serialNumber: 'SM002' }),
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters);
      jest
        .spyOn(service, 'processSmartMeterSettlement')
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Settlement failed'));

      await service.processAllMetersSettlement(SettlementTrigger.PERIODIC);

      expect(service.processSmartMeterSettlement).toHaveBeenCalledTimes(2);
    });
  });

  describe('processSmartMeterSettlement', () => {
    const mockMeter = createMockSmartMeter({
      id: 1,
      serialNumber: 'SM001',
      userId: 1,
      lastSettlementTime: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
    });

    beforeEach(() => {
      smartMetersService.findById.mockResolvedValue(mockMeter);
    });

    it('should process settlement for export energy (producer)', async () => {
      const mockReadings = [
        createMockEnergyReading({
          exportEnergyWh: 5000,
          importEnergyWh: 1000,
          timestamp: new Date(),
        }),
      ];

      energyReadingsService.findBySmartMeterAndTimeRange.mockResolvedValue(
        mockReadings,
      );
      energySettlementsService.create.mockResolvedValue(
        createMockEnergySettlement(),
      );
      blockchainService.convertEnergyToTokens.mockResolvedValue({
        success: true,
        tokenAmount: '4000',
        transactionHash: '0xtest123',
      });

      await service.processSmartMeterSettlement(1, SettlementTrigger.MANUAL);

      expect(
        energyReadingsService.findBySmartMeterAndTimeRange,
      ).toHaveBeenCalled();
      expect(blockchainService.convertEnergyToTokens).toHaveBeenCalledWith(
        1,
        4000,
      );
      expect(energySettlementsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          smartMeterId: 1,
          netEnergyWh: 4000,
          settlementType: 'EXPORT',
          trigger: SettlementTrigger.MANUAL,
        }),
      );
    });

    it('should process settlement for import energy (consumer)', async () => {
      const mockReadings = [
        createMockEnergyReading({
          exportEnergyWh: 1000,
          importEnergyWh: 6000,
          timestamp: new Date(),
        }),
      ];

      energyReadingsService.findBySmartMeterAndTimeRange.mockResolvedValue(
        mockReadings,
      );
      energySettlementsService.create.mockResolvedValue(
        createMockEnergySettlement(),
      );
      blockchainService.burnTokensForEnergy.mockResolvedValue({
        success: true,
        energyAmount: '5000',
        transactionHash: '0xtest456',
      });

      await service.processSmartMeterSettlement(1, SettlementTrigger.MANUAL);

      expect(blockchainService.burnTokensForEnergy).toHaveBeenCalledWith(
        1,
        5000,
      );
      expect(energySettlementsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          smartMeterId: 1,
          netEnergyWh: -5000,
          settlementType: 'IMPORT',
          trigger: SettlementTrigger.MANUAL,
        }),
      );
    });

    it('should skip settlement when net energy is zero', async () => {
      const mockReadings = [
        createMockEnergyReading({
          exportEnergyWh: 3000,
          importEnergyWh: 3000,
          timestamp: new Date(),
        }),
      ];

      energyReadingsService.findBySmartMeterAndTimeRange.mockResolvedValue(
        mockReadings,
      );

      await service.processSmartMeterSettlement(1, SettlementTrigger.MANUAL);

      expect(blockchainService.convertEnergyToTokens).not.toHaveBeenCalled();
      expect(blockchainService.burnTokensForEnergy).not.toHaveBeenCalled();
      expect(energySettlementsService.create).not.toHaveBeenCalled();
    });

    it('should skip settlement when net energy is below minimum threshold', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'MIN_SETTLEMENT_AMOUNT') return '2000';
        return undefined;
      });

      const mockReadings = [
        createMockEnergyReading({
          exportEnergyWh: 2500,
          importEnergyWh: 1000,
          timestamp: new Date(),
        }),
      ];

      energyReadingsService.findBySmartMeterAndTimeRange.mockResolvedValue(
        mockReadings,
      );

      await service.processSmartMeterSettlement(1, SettlementTrigger.MANUAL);

      expect(blockchainService.convertEnergyToTokens).not.toHaveBeenCalled();
      expect(energySettlementsService.create).not.toHaveBeenCalled();
    });

    it('should handle smart meter not found', async () => {
      smartMetersService.findById.mockResolvedValue(null);

      await expect(
        service.processSmartMeterSettlement(999, SettlementTrigger.MANUAL),
      ).rejects.toThrow('Smart meter not found');
    });

    it('should handle blockchain transaction failure', async () => {
      const mockReadings = [
        createMockEnergyReading({
          exportEnergyWh: 5000,
          importEnergyWh: 1000,
          timestamp: new Date(),
        }),
      ];

      energyReadingsService.findBySmartMeterAndTimeRange.mockResolvedValue(
        mockReadings,
      );
      blockchainService.convertEnergyToTokens.mockResolvedValue({
        success: false,
        error: 'Blockchain error',
      });

      await expect(
        service.processSmartMeterSettlement(1, SettlementTrigger.MANUAL),
      ).rejects.toThrow('Failed to process blockchain transaction');
    });
  });

  describe('manualSettlement', () => {
    it('should trigger manual settlement for specific smart meter', async () => {
      jest.spyOn(service, 'processSmartMeterSettlement').mockResolvedValue();

      const result = await service.manualSettlement(1);

      expect(result).toEqual({
        success: true,
        message: 'Manual settlement initiated for smart meter 1',
      });
      expect(service.processSmartMeterSettlement).toHaveBeenCalledWith(
        1,
        SettlementTrigger.MANUAL,
      );
    });

    it('should handle manual settlement failure', async () => {
      jest
        .spyOn(service, 'processSmartMeterSettlement')
        .mockRejectedValue(new Error('Settlement failed'));

      const result = await service.manualSettlement(1);

      expect(result).toEqual({
        success: false,
        error: 'Settlement failed',
      });
    });
  });

  describe('getSettlementHistory', () => {
    it('should return settlement history for a smart meter', async () => {
      const mockSettlements = [
        createMockEnergySettlement({ id: 1, smartMeterId: 1 }),
        createMockEnergySettlement({ id: 2, smartMeterId: 1 }),
      ];

      energySettlementsService.findBySmartMeterId.mockResolvedValue(
        mockSettlements,
      );

      const result = await service.getSettlementHistory(1, 10, 0);

      expect(result).toEqual({
        settlements: mockSettlements,
        total: 2,
        page: 0,
        pageSize: 10,
      });
      expect(energySettlementsService.findBySmartMeterId).toHaveBeenCalledWith(
        1,
        10,
        0,
      );
    });
  });

  describe('getSettlementStats', () => {
    it('should return settlement statistics', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockSettlements = [
        createMockEnergySettlement({
          netEnergyWh: 5000,
          settlementType: 'EXPORT',
          tokenAmount: '5000',
        }),
        createMockEnergySettlement({
          netEnergyWh: -3000,
          settlementType: 'IMPORT',
          tokenAmount: '3000',
        }),
      ];

      energySettlementsService.findByDateRange.mockResolvedValue(
        mockSettlements,
      );

      const result = await service.getSettlementStats(1, startDate, endDate);

      expect(result).toEqual({
        totalExportedWh: 5000,
        totalImportedWh: 3000,
        totalTokensEarned: '5000',
        totalTokensSpent: '3000',
        netEnergyWh: 2000,
        settlementCount: 2,
        period: {
          startDate,
          endDate,
        },
      });
    });
  });

  describe('sendSettlementCommand', () => {
    it('should send settlement command via MQTT', async () => {
      const mockMeter = createMockSmartMeter({ serialNumber: 'SM001' });
      smartMetersService.findById.mockResolvedValue(mockMeter);

      await service.sendSettlementCommand(1);

      expect(mqttService.publishDeviceCommand).toHaveBeenCalledWith(
        'SM001',
        expect.objectContaining({
          command: 'TRIGGER_SETTLEMENT',
          parameters: {
            timestamp: expect.any(String),
            settlementId: expect.any(String),
          },
        }),
      );
    });

    it('should handle MQTT not connected', async () => {
      const mockMeter = createMockSmartMeter({ serialNumber: 'SM001' });
      smartMetersService.findById.mockResolvedValue(mockMeter);
      mqttService.isConnected.mockReturnValue(false);

      await expect(service.sendSettlementCommand(1)).rejects.toThrow(
        'MQTT service not connected',
      );
    });
  });

  describe('calculateNetEnergy', () => {
    it('should calculate net energy correctly', () => {
      const readings = [
        createMockEnergyReading({ exportEnergyWh: 1000, importEnergyWh: 200 }),
        createMockEnergyReading({ exportEnergyWh: 1500, importEnergyWh: 300 }),
        createMockEnergyReading({ exportEnergyWh: 800, importEnergyWh: 600 }),
      ];

      const result = (service as any).calculateNetEnergy(readings);

      expect(result).toEqual({
        totalExportWh: 3300,
        totalImportWh: 1100,
        netEnergyWh: 2200,
      });
    });

    it('should handle empty readings array', () => {
      const result = (service as any).calculateNetEnergy([]);

      expect(result).toEqual({
        totalExportWh: 0,
        totalImportWh: 0,
        netEnergyWh: 0,
      });
    });
  });

  describe('validateSettlementAmount', () => {
    it('should validate settlement amount within limits', () => {
      const result = (service as any).validateSettlementAmount(5000);
      expect(result).toBe(true);
    });

    it('should reject settlement amount below minimum', () => {
      const result = (service as any).validateSettlementAmount(500);
      expect(result).toBe(false);
    });

    it('should reject settlement amount above maximum', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'MAX_SETTLEMENT_AMOUNT') return '10000';
        return undefined;
      });

      const result = (service as any).validateSettlementAmount(15000);
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      smartMetersService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await service.processAllMetersSettlement(SettlementTrigger.PERIODIC);

      // Should not throw, but log error
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should handle blockchain service unavailable', async () => {
      const mockMeter = createMockSmartMeter({ id: 1, userId: 1 });
      const mockReadings = [
        createMockEnergyReading({ exportEnergyWh: 5000, importEnergyWh: 1000 }),
      ];

      smartMetersService.findById.mockResolvedValue(mockMeter);
      energyReadingsService.findBySmartMeterAndTimeRange.mockResolvedValue(
        mockReadings,
      );
      blockchainService.convertEnergyToTokens.mockRejectedValue(
        new Error('Blockchain unavailable'),
      );

      await expect(
        service.processSmartMeterSettlement(1, SettlementTrigger.MANUAL),
      ).rejects.toThrow('Blockchain unavailable');
    });
  });
});
