import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EnergySettlementService } from '../../../src/services/energy/energy-settlement.service';
import { EnergySettlementsService } from '../../../src/models/energySettlement/energySettlement.service';
import { SmartMetersService } from '../../../src/models/smartMeter/smartMeter.service';
import { BlockchainService } from '../../../src/services/blockchain/blockchain.service';
import { MqttService } from '../../../src/services/telemetry/mqtt.service';
import { TransactionLogsService } from '../../../src/models/transactionLog/transactionLog.service';
import { WalletsService } from '../../../src/models/wallet/wallet.service';
import { ProsumersService } from '../../../src/models/user/user.service';
import { StatService } from '../../../src/services/stat/stat.service';
import { EnergyAnalyticsService } from '../../../src/services/energy/energy-analytics.service';
import { RedisTelemetryService } from '../../../src/services/telemetry/redis-telemetry.service';
import {
  createMockConfigService,
  createMockMqttClient,
} from '../../helpers/mock-external-services.helper';
import {
  createMockUser,
  createMockSmartMeter,
  createMockWallet,
  createMockEnergySettlement,
} from '../../helpers/mock-factories.helper';
import {
  SettlementTrigger,
  TransactionStatus,
} from '../../../src/common/enums';

describe('EnergySettlementService', () => {
  let service: EnergySettlementService;
  let energySettlementsService: jest.Mocked<EnergySettlementsService>;
  let smartMetersService: jest.Mocked<SmartMetersService>;
  let redisTelemetryService: jest.Mocked<RedisTelemetryService>;
  let blockchainService: jest.Mocked<BlockchainService>;
  let mqttService: jest.Mocked<MqttService>;
  let usersService: jest.Mocked<ProsumersService>;
  let walletsService: jest.Mocked<WalletsService>;
  let energyAnalyticsService: jest.Mocked<EnergyAnalyticsService>;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnergySettlementService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                AUTO_SETTLEMENT_ENABLED: 'true',
                SETTLEMENT_INTERVAL_MINUTES: '5',
              };
              return config[key];
            }),
          },
        },
        {
          provide: EnergySettlementsService,
          useValue: {
            findByTxHash: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: SmartMetersService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        {
          provide: RedisTelemetryService,
          useValue: {
            getLatestData: jest.fn(),
          },
        },
        {
          provide: BlockchainService,
          useValue: {
            getMinSettlementWh: jest.fn(),
            isMeterIdAuthorized: jest.fn(),
            isMeterAuthorized: jest.fn(),
            authorizeMeter: jest.fn(),
            getCalculateEtkAmount: jest.fn(),
            calculateEtkAmount: jest.fn(),
            processEnergySettlement: jest.fn(),
            getSettlement: jest.fn(),
            getConversionRatio: jest.fn(),
          },
        },
        {
          provide: MqttService,
          useValue: {
            sendCommand: jest.fn(),
          },
        },
        {
          provide: TransactionLogsService,
          useValue: {},
        },
        {
          provide: ProsumersService,
          useValue: {
            findByMeterId: jest.fn(),
            getPrimaryWallet: jest.fn(),
          },
        },
        {
          provide: WalletsService,
          useValue: {},
        },
        {
          provide: StatService,
          useValue: {},
        },
        {
          provide: EnergyAnalyticsService,
          useValue: {
            getRealTimeEnergyData: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EnergySettlementService>(EnergySettlementService);
    energySettlementsService = module.get(EnergySettlementsService);
    smartMetersService = module.get(SmartMetersService);
    redisTelemetryService = module.get(RedisTelemetryService);
    blockchainService = module.get(BlockchainService);
    mqttService = module.get(MqttService);
    usersService = module.get(ProsumersService);
    walletsService = module.get(WalletsService);
    energyAnalyticsService = module.get(EnergyAnalyticsService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettlementIdDbByTxHash', () => {
    it('should return settlement ID when found', async () => {
      const txHash = '0xabc123';
      const mockSettlement = createMockEnergySettlement({
        settlementId: 42,
        blockchainTxHash: txHash,
      });

      energySettlementsService.findByTxHash.mockResolvedValue(
        mockSettlement as any,
      );

      const result = await service.getSettlementIdDbByTxHash(txHash);

      expect(result).toBe(42);
      expect(energySettlementsService.findByTxHash).toHaveBeenCalledWith(
        txHash,
      );
    });

    it('should return null when settlement not found', async () => {
      energySettlementsService.findByTxHash.mockResolvedValue(null);

      const result = await service.getSettlementIdDbByTxHash('0xinvalid');

      expect(result).toBeNull();
    });

    it('should return null when settlement has no settlementId', async () => {
      energySettlementsService.findByTxHash.mockResolvedValue({} as any);

      const result = await service.getSettlementIdDbByTxHash('0xabc');

      expect(result).toBeNull();
    });
  });

  describe('getMeterIdByTxHash', () => {
    it('should return meter ID when found', async () => {
      const txHash = '0xdef456';
      const mockSettlement = createMockEnergySettlement({
        meterId: 'METER001',
        blockchainTxHash: txHash,
      });

      energySettlementsService.findByTxHash.mockResolvedValue(
        mockSettlement as any,
      );

      const result = await service.getMeterIdByTxHash(txHash);

      expect(result).toBe('METER001');
    });

    it('should return null when settlement not found', async () => {
      energySettlementsService.findByTxHash.mockResolvedValue(null);

      const result = await service.getMeterIdByTxHash('0xinvalid');

      expect(result).toBeNull();
    });
  });

  describe('processAllMetersSettlement', () => {
    it('should process settlement for all active meters', async () => {
      const mockMeters = [
        createMockSmartMeter({ meterId: 'METER001' }),
        createMockSmartMeter({ meterId: 'METER002' }),
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);

      // Mock processMeterSettlement to avoid full execution
      const processSpy = jest
        .spyOn(service, 'processMeterSettlement')
        .mockResolvedValue('0xabc123');

      await service.processAllMetersSettlement(SettlementTrigger.PERIODIC);

      expect(smartMetersService.findAll).toHaveBeenCalled();
      expect(processSpy).toHaveBeenCalledTimes(2);
      expect(processSpy).toHaveBeenCalledWith(
        'METER001',
        SettlementTrigger.PERIODIC,
      );
      expect(processSpy).toHaveBeenCalledWith(
        'METER002',
        SettlementTrigger.PERIODIC,
      );
    });

    it('should handle empty meters list', async () => {
      smartMetersService.findAll.mockResolvedValue([]);

      const processSpy = jest.spyOn(service, 'processMeterSettlement');

      await service.processAllMetersSettlement();

      expect(smartMetersService.findAll).toHaveBeenCalled();
      expect(processSpy).not.toHaveBeenCalled();
    });

    it('should handle errors in individual meter processing', async () => {
      const mockMeters = [
        createMockSmartMeter({ meterId: 'METER001' }),
        createMockSmartMeter({ meterId: 'METER002' }),
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);

      const processSpy = jest
        .spyOn(service, 'processMeterSettlement')
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce('0xabc123');

      // Error will stop processing due to await in loop
      try {
        await service.processAllMetersSettlement();
      } catch (error) {
        // Expected to throw
      }

      // Only first meter will be processed before error
      expect(processSpy).toHaveBeenCalledTimes(1);
    });

    it('should use manual trigger when specified', async () => {
      const mockMeters = [createMockSmartMeter({ meterId: 'METER001' })];
      smartMetersService.findAll.mockResolvedValue(mockMeters as any);

      const processSpy = jest
        .spyOn(service, 'processMeterSettlement')
        .mockResolvedValue('0xabc123');

      await service.processAllMetersSettlement(SettlementTrigger.MANUAL);

      expect(processSpy).toHaveBeenCalledWith(
        'METER001',
        SettlementTrigger.MANUAL,
      );
    });
  });

  describe('periodicSettlement', () => {
    it('should process settlement when auto settlement is enabled', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('true');
      const processSpy = jest
        .spyOn(service, 'processAllMetersSettlement')
        .mockResolvedValue(undefined);

      await service.periodicSettlement();

      expect(processSpy).toHaveBeenCalledWith(SettlementTrigger.PERIODIC);
    });

    it('should skip processing when auto settlement is disabled', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('false');
      const processSpy = jest.spyOn(service, 'processAllMetersSettlement');

      await service.periodicSettlement();

      expect(processSpy).not.toHaveBeenCalled();
    });
  });

  describe('getLatestSettlementReadings', () => {
    it('should return settlement readings from Redis', async () => {
      const meterId = 'METER001';
      const mockTelemetry = {
        datetime: '2024-01-15T10:30:00Z',
        data: {
          export: { settlement_energy: 5000 },
          import: { settlement_energy: 2000 },
        },
      };

      redisTelemetryService.getLatestData.mockResolvedValue(
        mockTelemetry as any,
      );

      const result = await (service as any).getLatestSettlementReadings(
        meterId,
      );

      expect(result).toBeDefined();
      expect(result.exportEnergyWh).toBe(5000);
      expect(result.importEnergyWh).toBe(2000);
      expect(result.netEnergyWh).toBe(3000); // 5000 - 2000
      expect(result.lastReadingTime).toBe('2024-01-15T10:30:00Z');
    });

    it('should return null when no telemetry data found', async () => {
      redisTelemetryService.getLatestData.mockResolvedValue(null);

      const result = await (service as any).getLatestSettlementReadings(
        'METER001',
      );

      expect(result).toBeNull();
    });

    it('should handle missing data property', async () => {
      redisTelemetryService.getLatestData.mockResolvedValue({
        datetime: '2024-01-15T10:30:00Z',
      } as any);

      const result = await (service as any).getLatestSettlementReadings(
        'METER001',
      );

      expect(result).toBeNull();
    });

    it('should use fallback values for invalid export/import energy', async () => {
      const mockTelemetry = {
        datetime: '2024-01-15T10:30:00Z',
        data: {
          export: { settlement_energy: NaN },
          import: { settlement_energy: Infinity },
        },
      };

      redisTelemetryService.getLatestData.mockResolvedValue(
        mockTelemetry as any,
      );

      const result = await (service as any).getLatestSettlementReadings(
        'METER001',
      );

      expect(result).toBeDefined();
      expect(result.exportEnergyWh).toBe(0);
      expect(result.importEnergyWh).toBe(0);
      expect(result.netEnergyWh).toBe(0);
    });

    it('should handle undefined settlement_energy values', async () => {
      const mockTelemetry = {
        datetime: '2024-01-15T10:30:00Z',
        data: {
          export: {},
          import: {},
        },
      };

      redisTelemetryService.getLatestData.mockResolvedValue(
        mockTelemetry as any,
      );

      const result = await (service as any).getLatestSettlementReadings(
        'METER001',
      );

      expect(result).toBeDefined();
      expect(result.exportEnergyWh).toBe(0);
      expect(result.importEnergyWh).toBe(0);
      expect(result.netEnergyWh).toBe(0);
    });
  });

  describe('sendSettlementResetCommand', () => {
    it('should send MQTT reset command', async () => {
      const meterId = 'METER001';
      const userId = 'PROSUMER001';

      await (service as any).sendSettlementResetCommand(meterId, userId);

      expect(mqttService.sendCommand).toHaveBeenCalledWith(
        meterId,
        { energy: { reset_settlement: 'all' } },
        userId,
      );
    });

    it('should handle MQTT command errors gracefully', async () => {
      mqttService.sendCommand.mockRejectedValue(new Error('MQTT error'));

      // Should not throw
      await expect(
        (service as any).sendSettlementResetCommand('METER001', 'PROSUMER001'),
      ).resolves.not.toThrow();
    });
  });

  describe('manualSettlement', () => {
    it('should process settlement for authorized user', async () => {
      const meterId = 'METER001';
      const userId = 'PROSUMER001';
      const mockProsumers = [
        {
          userId: userId,
          username: 'testuser',
        },
      ];

      usersService.findByMeterId.mockResolvedValue(mockProsumers as any);

      const processSpy = jest
        .spyOn(service, 'processMeterSettlement')
        .mockResolvedValue('0xabc123');

      const result = await service.manualSettlement(meterId, userId);

      expect(result).toBe('0xabc123');
      expect(usersService.findByMeterId).toHaveBeenCalledWith(meterId);
      expect(processSpy).toHaveBeenCalledWith(
        meterId,
        SettlementTrigger.MANUAL,
      );
    });

    it('should throw error for unauthorized user', async () => {
      const meterId = 'METER001';
      const userId = 'PROSUMER001';
      const mockProsumers = [createMockUser({ userId: 'PROSUMER002' })];

      usersService.findByMeterId.mockResolvedValue(mockProsumers as any);

      await expect(
        service.manualSettlement(meterId, userId),
      ).rejects.toThrow('Unauthorized: Prosumer does not own this meter');
    });

    it('should handle errors during manual settlement', async () => {
      usersService.findByMeterId.mockRejectedValue(new Error('DB error'));

      await expect(
        service.manualSettlement('METER001', 'PROSUMER001'),
      ).rejects.toThrow('DB error');
    });
  });

  describe('confirmSettlement', () => {
    it('should update settlement status to success', async () => {
      const settlementId = 1;
      const txHash = '0xabc123';
      const etkAmount = 5.5;
      const mockSettlement = createMockEnergySettlement({
        settlementId,
        meterId: 'METER001',
        status: 'PENDING',
      });

      energySettlementsService.findOne.mockResolvedValue(mockSettlement as any);
      energySettlementsService.update.mockResolvedValue(mockSettlement as any);

      await service.confirmSettlement(settlementId, txHash, true, etkAmount);

      expect(energySettlementsService.update).toHaveBeenCalledWith(
        settlementId,
        expect.objectContaining({
          status: TransactionStatus.SUCCESS,
          blockchainTxHash: txHash,
          etkAmountCredited: etkAmount,
        }),
      );
    });

    it('should update settlement status to failed', async () => {
      const settlementId = 1;
      const txHash = '0xfailed';
      const mockSettlement = createMockEnergySettlement({ settlementId });

      energySettlementsService.findOne.mockResolvedValue(mockSettlement as any);
      energySettlementsService.update.mockResolvedValue(mockSettlement as any);

      await service.confirmSettlement(settlementId, txHash, false);

      expect(energySettlementsService.update).toHaveBeenCalledWith(
        settlementId,
        expect.objectContaining({
          status: TransactionStatus.FAILED,
          blockchainTxHash: txHash,
        }),
      );
    });

    it('should handle settlement not found', async () => {
      energySettlementsService.findOne.mockResolvedValue(undefined as any);

      // Should not throw
      await service.confirmSettlement(999, '0xabc', true);

      expect(energySettlementsService.update).not.toHaveBeenCalled();
    });
  });

  describe('getSettlementHistory', () => {
    it('should return own settlements for user', async () => {
      const userId = 'PROSUMER001';
      const mockMeters = [
        createMockSmartMeter({ meterId: 'METER001', userId }),
        createMockSmartMeter({ meterId: 'METER002', userId }),
      ];
      const mockSettlements = [
        createMockEnergySettlement({ meterId: 'METER001' }),
        createMockEnergySettlement({ meterId: 'METER002' }),
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      energySettlementsService.findAll.mockResolvedValue(
        mockSettlements as any,
      );

      const result = await service.getSettlementHistory(
        undefined,
        userId,
        50,
        'own',
      );

      expect(result).toHaveLength(2);
      expect(smartMetersService.findAll).toHaveBeenCalledWith({ userId });
    });

    it('should filter settlements by specific meterId', async () => {
      const userId = 'PROSUMER001';
      const meterId = 'METER001';
      const mockMeters = [
        createMockSmartMeter({ meterId: 'METER001', userId }),
        createMockSmartMeter({ meterId: 'METER002', userId }),
      ];
      const mockSettlements = [
        createMockEnergySettlement({ meterId: 'METER001' }),
        createMockEnergySettlement({ meterId: 'METER002' }),
      ];

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      energySettlementsService.findAll.mockResolvedValue(
        mockSettlements as any,
      );

      const result = await service.getSettlementHistory(
        meterId,
        userId,
        50,
        'own',
      );

      expect(result).toHaveLength(1);
      expect(result[0].meterId).toBe('METER001');
    });

    it('should return public settlements without sensitive data', async () => {
      const mockSettlements = [
        createMockEnergySettlement({ meterId: 'METER001' }),
        createMockEnergySettlement({ meterId: 'METER002' }),
      ];

      energySettlementsService.findAll.mockResolvedValue(
        mockSettlements as any,
      );

      const result = await service.getSettlementHistory(
        undefined,
        undefined,
        50,
        'public',
      );

      expect(result).toHaveLength(2);
      expect(energySettlementsService.findAll).toHaveBeenCalled();
      expect(smartMetersService.findAll).not.toHaveBeenCalled();
    });

    it('should return all settlements for admin scope', async () => {
      const mockSettlements = [
        createMockEnergySettlement({ meterId: 'METER001' }),
        createMockEnergySettlement({ meterId: 'METER002' }),
      ];

      energySettlementsService.findAll.mockResolvedValue(
        mockSettlements as any,
      );

      const result = await service.getSettlementHistory(
        undefined,
        undefined,
        50,
        'all',
      );

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockSettlements);
    });

    it('should throw error when userId missing for own scope', async () => {
      await expect(
        service.getSettlementHistory(undefined, undefined, 50, 'own'),
      ).rejects.toThrow('Prosumer ID is required for own settlements');
    });

    it('should respect limit parameter', async () => {
      const mockSettlements = Array.from({ length: 100 }, (_, i) =>
        createMockEnergySettlement({ settlementId: i + 1 }),
      );

      energySettlementsService.findAll.mockResolvedValue(
        mockSettlements as any,
      );

      const result = await service.getSettlementHistory(
        undefined,
        undefined,
        10,
        'public',
      );

      expect(result).toHaveLength(10);
    });

    it('should sort settlements by creation date descending', async () => {
      const now = new Date();
      const mockSettlements = [
        createMockEnergySettlement({
          settlementId: 1,
          createdAtBackend: new Date(now.getTime() - 3600000) as any,
        }),
        createMockEnergySettlement({
          settlementId: 2,
          createdAtBackend: new Date(now.getTime() - 1800000) as any,
        }),
        createMockEnergySettlement({
          settlementId: 3,
          createdAtBackend: now as any,
        }),
      ];

      energySettlementsService.findAll.mockResolvedValue(
        mockSettlements as any,
      );

      const result = await service.getSettlementHistory(
        undefined,
        undefined,
        50,
        'public',
      );

      expect(result[0].settlementId).toBe(3); // Most recent
      expect(result[2].settlementId).toBe(1); // Oldest
    });
  });

  describe('getSettlementEstimator', () => {
    it('should return estimator data with valid readings', async () => {
      const meterId = 'METER001';
      const userId = 'PROSUMER001';
      const mockProsumers = [
        {
          userId: userId,
          username: 'testuser',
        },
      ];
      const mockRealTimeData = {
        timeSeries: [
          {
            netFlow: 2.5, // 2.5 kW export
            gridExport: 3.0,
            gridImport: 0.5,
            settlementEnergyWh: {
              export: 5.0, // 5 kWh
              import: 2.0, // 2 kWh
            },
          },
        ],
      };

      usersService.findByMeterId.mockResolvedValue(mockProsumers as any);
      energyAnalyticsService.getRealTimeEnergyData.mockResolvedValue(
        mockRealTimeData as any,
      );
      blockchainService.calculateEtkAmount
        .mockResolvedValueOnce(3.0) // currentRunningEtk
        .mockResolvedValueOnce(3.5); // estimatedEtkAtSettlement

      const result = await service.getSettlementEstimator(meterId);

      expect(result).toBeDefined();
      expect(result!.status).toBe('EXPORTING'); // 2.5 kW > 0.05
      expect(result!.currentPowerKw).toBe(2.5);
      expect(result!.netEnergyWh).toBe(3000); // (5 - 2) * 1000
      expect(result!.settlementEnergyWh).toEqual({
        gridExport: 5000,
        gridImport: 2000,
      });
    });

    it('should return null when no user found', async () => {
      usersService.findByMeterId.mockResolvedValue([]);

      const result = await service.getSettlementEstimator('METER001');

      expect(result).toBeNull();
    });

    it('should return null when no real-time data available', async () => {
      const mockProsumers = [createMockUser({ userId: 'PROSUMER001' })];

      usersService.findByMeterId.mockResolvedValue(mockProsumers as any);
      energyAnalyticsService.getRealTimeEnergyData.mockResolvedValue({
        timeSeries: [],
      } as any);

      const result = await service.getSettlementEstimator('METER001');

      expect(result).toBeNull();
    });

    it('should determine IMPORTING status for negative power', async () => {
      const mockProsumers = [
        {
          userId: 'PROSUMER001',
          username: 'testuser',
        },
      ];
      const mockRealTimeData = {
        timeSeries: [
          {
            netFlow: -1.5, // 1.5 kW import
            settlementEnergyWh: {
              export: 1.0,
              import: 3.0,
            },
          },
        ],
      };

      usersService.findByMeterId.mockResolvedValue(mockProsumers as any);
      energyAnalyticsService.getRealTimeEnergyData.mockResolvedValue(
        mockRealTimeData as any,
      );
      blockchainService.calculateEtkAmount
        .mockResolvedValueOnce(2.0)
        .mockResolvedValueOnce(2.5);

      const result = await service.getSettlementEstimator('METER001');

      expect(result!.status).toBe('IMPORTING'); // -1.5 kW < -0.05
    });

    it('should determine IDLE status for near-zero power', async () => {
      const mockProsumers = [
        {
          userId: 'PROSUMER001',
          username: 'testuser',
        },
      ];
      const mockRealTimeData = {
        timeSeries: [
          {
            netFlow: 0.02, // 20W, below 50W threshold
            settlementEnergyWh: {
              export: 1.0,
              import: 1.0,
            },
          },
        ],
      };

      usersService.findByMeterId.mockResolvedValue(mockProsumers as any);
      energyAnalyticsService.getRealTimeEnergyData.mockResolvedValue(
        mockRealTimeData as any,
      );
      blockchainService.calculateEtkAmount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getSettlementEstimator('METER001');

      expect(result!.status).toBe('IDLE');
    });

    it('should calculate progress percentage based on settlement interval', async () => {
      const mockProsumers = [
        {
          userId: 'PROSUMER001',
          username: 'testuser',
        },
      ];
      const mockRealTimeData = {
        timeSeries: [
          {
            netFlow: 1.0,
            settlementEnergyWh: { export: 2.0, import: 1.0 },
          },
        ],
      };

      usersService.findByMeterId.mockResolvedValue(mockProsumers as any);
      energyAnalyticsService.getRealTimeEnergyData.mockResolvedValue(
        mockRealTimeData as any,
      );
      blockchainService.calculateEtkAmount
        .mockResolvedValueOnce(1.0)
        .mockResolvedValueOnce(1.2);

      const result = await service.getSettlementEstimator('METER001');

      expect(result!.progressPercentage).toBeGreaterThanOrEqual(0);
      expect(result!.progressPercentage).toBeLessThanOrEqual(100);
      expect(result!.timeRemaining).toMatch(/^\d{2}:\d{2}$/); // MM:SS format
    });

    it('should handle invalid settlement energy data', async () => {
      const mockProsumers = [createMockUser({ userId: 'PROSUMER001' })];
      const mockRealTimeData = {
        timeSeries: [
          {
            netFlow: 1.0,
            settlementEnergyWh: {
              export: NaN,
              import: Infinity,
            },
          },
        ],
      };

      usersService.findByMeterId.mockResolvedValue(mockProsumers as any);
      energyAnalyticsService.getRealTimeEnergyData.mockResolvedValue(
        mockRealTimeData as any,
      );

      const result = await service.getSettlementEstimator('METER001');

      expect(result).toBeNull();
    });
  });

  describe('logPowerData', () => {
    it('should log power data for all active meters', async () => {
      const mockMeters = [
        createMockSmartMeter({ meterId: 'METER001' }),
        createMockSmartMeter({ meterId: 'METER002' }),
      ];
      const mockProsumers = [
        {
          userId: 'PROSUMER001',
          username: 'testuser',
        },
      ];
      const mockRealTimeData = {
        timeSeries: [{ netFlow: 2.5 }],
      };

      smartMetersService.findAll.mockResolvedValue(mockMeters as any);
      usersService.findByMeterId.mockResolvedValue(mockProsumers as any);
      energyAnalyticsService.getRealTimeEnergyData.mockResolvedValue(
        mockRealTimeData as any,
      );

      await service.logPowerData();

      expect(smartMetersService.findAll).toHaveBeenCalled();
      expect(usersService.findByMeterId).toHaveBeenCalledTimes(2);
      expect(
        energyAnalyticsService.getRealTimeEnergyData,
      ).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during power logging', async () => {
      smartMetersService.findAll.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.logPowerData()).resolves.not.toThrow();
    });
  });

  describe('Blockchain wrapper methods', () => {
    it('getBlockchainSettlement should return blockchain settlement data', async () => {
      const settlementId = 'settlement_1_123456';
      const mockBlockchainData = {
        meterId: 'METER001',
        netEnergyWh: 5000,
        etkAmount: 50,
      };

      blockchainService.getSettlement.mockResolvedValue(
        mockBlockchainData as any,
      );

      const result = await service.getBlockchainSettlement(settlementId);

      expect(result).toEqual(mockBlockchainData);
      expect(blockchainService.getSettlement).toHaveBeenCalledWith(
        settlementId,
      );
    });

    it('getBlockchainSettlement should handle errors', async () => {
      blockchainService.getSettlement.mockRejectedValue(
        new Error('Blockchain error'),
      );

      const result = await service.getBlockchainSettlement('settlement_1');

      expect(result).toBeNull();
    });

    it('getConversionRatio should return ratio from blockchain', async () => {
      blockchainService.getConversionRatio.mockResolvedValue(100);

      const result = await service.getConversionRatio();

      expect(result).toBe(100);
    });

    it('getConversionRatio should return fallback on error', async () => {
      blockchainService.getConversionRatio.mockRejectedValue(
        new Error('Error'),
      );

      const result = await service.getConversionRatio();

      expect(result).toBe(100); // Default fallback
    });

    it('getMinimumSettlementThreshold should return threshold from blockchain', async () => {
      blockchainService.getMinSettlementWh.mockResolvedValue(500);

      const result = await service.getMinimumSettlementThreshold();

      expect(result).toBe(500);
    });

    it('getMinimumSettlementThreshold should return fallback on error', async () => {
      blockchainService.getMinSettlementWh.mockRejectedValue(
        new Error('Error'),
      );

      const result = await service.getMinimumSettlementThreshold();

      expect(result).toBe(100); // Default fallback
    });

    it('authorizeMeterOnBlockchain should delegate to blockchain service', async () => {
      const ownerAddress = '0xOwner';
      const meterId = 'METER001';
      const meterAddress = '0xMeter';
      const txHash = '0xabc123';

      blockchainService.authorizeMeter.mockResolvedValue(txHash);

      const result = await service.authorizeMeterOnBlockchain(
        ownerAddress,
        meterId,
        meterAddress,
      );

      expect(result).toBe(txHash);
      expect(blockchainService.authorizeMeter).toHaveBeenCalledWith(
        ownerAddress,
        meterId,
        meterAddress,
      );
    });

    it('authorizeMeterOnBlockchain should propagate errors', async () => {
      blockchainService.authorizeMeter.mockRejectedValue(
        new Error('Authorization failed'),
      );

      await expect(
        service.authorizeMeterOnBlockchain('0xOwner', 'METER001', '0xMeter'),
      ).rejects.toThrow('Authorization failed');
    });

    it('checkMeterAuthorization should return authorization status', async () => {
      blockchainService.isMeterIdAuthorized.mockResolvedValue(true);

      const result = await service.checkMeterAuthorization('METER001');

      expect(result).toBe(true);
    });

    it('checkMeterAuthorization should return false on error', async () => {
      blockchainService.isMeterIdAuthorized.mockRejectedValue(
        new Error('Error'),
      );

      const result = await service.checkMeterAuthorization('METER001');

      expect(result).toBe(false);
    });
  });
});
