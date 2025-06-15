import { Test, TestingModule } from '@nestjs/testing';
import { EnergyController } from '../energy.controller';
import { EnergySettlementService } from '../../services/energy-settlement.service';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { SettlementTrigger } from '../../common/enums';
import { mockJwtUser } from '../../test-setup';

describe('EnergyController', () => {
  let controller: EnergyController;
  let energySettlementService: jest.Mocked<EnergySettlementService>;

  beforeEach(async () => {
    const mockEnergySettlementService = {
      manualSettlement: jest.fn(),
      processAllMetersSettlement: jest.fn(),
      getSettlementHistory: jest.fn(),
      getSettlementStats: jest.fn(),
      sendSettlementCommand: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnergyController],
      providers: [
        {
          provide: EnergySettlementService,
          useValue: mockEnergySettlementService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EnergyController>(EnergyController);
    energySettlementService = module.get(EnergySettlementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('POST /energy/settlement/manual/:meterId', () => {
    it('should initiate manual settlement successfully', async () => {
      const meterId = '1';
      const mockRequest = { user: mockJwtUser };
      const expectedTransactionHash = '0x123abc456def';

      energySettlementService.manualSettlement.mockResolvedValue({
        success: true,
        transactionHash: expectedTransactionHash,
      });

      const result = await controller.manualSettlement(meterId, mockRequest);

      expect(result).toEqual({
        success: true,
        transactionHash: expectedTransactionHash,
        message: 'Manual settlement initiated',
      });

      expect(energySettlementService.manualSettlement).toHaveBeenCalledWith(
        meterId,
        mockJwtUser.prosumerId,
      );
    });

    it('should handle settlement service errors', async () => {
      const meterId = '1';
      const mockRequest = { user: mockJwtUser };

      energySettlementService.manualSettlement.mockRejectedValue(
        new Error('Settlement failed'),
      );

      await expect(
        controller.manualSettlement(meterId, mockRequest),
      ).rejects.toThrow('Settlement failed');
    });
  });

  describe('POST /energy/settlement/process-all', () => {
    it('should process all settlements successfully', async () => {
      const mockRequest = { user: mockJwtUser };

      energySettlementService.processAllMetersSettlement.mockResolvedValue();

      const result = await controller.processAllSettlements(mockRequest);

      expect(result).toEqual({
        success: true,
        message: 'Settlement processing initiated for all meters',
      });

      expect(
        energySettlementService.processAllMetersSettlement,
      ).toHaveBeenCalledWith(SettlementTrigger.MANUAL);
    });

    it('should handle errors in processing all settlements', async () => {
      const mockRequest = { user: mockJwtUser };

      energySettlementService.processAllMetersSettlement.mockRejectedValue(
        new Error('Processing failed'),
      );

      await expect(
        controller.processAllSettlements(mockRequest),
      ).rejects.toThrow('Processing failed');
    });
  });

  describe('GET /energy/settlement/history', () => {
    it('should return settlement history with default parameters', async () => {
      const mockRequest = { user: mockJwtUser };
      const mockHistory = {
        settlements: [
          {
            id: 1,
            smartMeterId: 1,
            netEnergyWh: 2000,
            settlementType: 'EXPORT',
            timestamp: new Date(),
          },
        ],
        total: 1,
        page: 0,
        pageSize: 10,
      };

      energySettlementService.getSettlementHistory.mockResolvedValue(
        mockHistory,
      );

      const result = await controller.getSettlementHistory(mockRequest);

      expect(result).toEqual(mockHistory);
      expect(energySettlementService.getSettlementHistory).toHaveBeenCalledWith(
        undefined, // meterId
        10, // default limit
        0, // default offset
      );
    });

    it('should return settlement history with custom parameters', async () => {
      const mockRequest = { user: mockJwtUser };
      const meterId = '1';
      const limit = '20';
      const mockHistory = {
        settlements: [],
        total: 0,
        page: 0,
        pageSize: 20,
      };

      energySettlementService.getSettlementHistory.mockResolvedValue(
        mockHistory,
      );

      const result = await controller.getSettlementHistory(
        mockRequest,
        meterId,
        limit,
      );

      expect(result).toEqual(mockHistory);
      expect(energySettlementService.getSettlementHistory).toHaveBeenCalledWith(
        meterId,
        20,
        0,
      );
    });

    it('should handle invalid limit parameter', async () => {
      const mockRequest = { user: mockJwtUser };
      const invalidLimit = 'invalid';

      energySettlementService.getSettlementHistory.mockResolvedValue({
        settlements: [],
        total: 0,
        page: 0,
        pageSize: 10,
      });

      const result = await controller.getSettlementHistory(
        mockRequest,
        undefined,
        invalidLimit,
      );

      expect(energySettlementService.getSettlementHistory).toHaveBeenCalledWith(
        undefined,
        10, // Falls back to default
        0,
      );
    });
  });

  describe('GET /energy/settlement/stats', () => {
    it('should return settlement statistics', async () => {
      const mockRequest = { user: mockJwtUser };
      const startDate = '2025-06-01';
      const endDate = '2025-06-14';
      const meterId = '1';

      const mockStats = {
        totalExportedWh: 50000,
        totalImportedWh: 30000,
        totalTokensEarned: '20000',
        totalTokensSpent: '10000',
        netEnergyWh: 20000,
        settlementCount: 15,
        period: {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      };

      energySettlementService.getSettlementStats.mockResolvedValue(mockStats);

      const result = await controller.getSettlementStats(
        mockRequest,
        meterId,
        startDate,
        endDate,
      );

      expect(result).toEqual(mockStats);
      expect(energySettlementService.getSettlementStats).toHaveBeenCalledWith(
        parseInt(meterId),
        new Date(startDate),
        new Date(endDate),
      );
    });

    it('should handle missing date parameters', async () => {
      const mockRequest = { user: mockJwtUser };
      const meterId = '1';

      const mockStats = {
        totalExportedWh: 1000,
        totalImportedWh: 800,
        totalTokensEarned: '200',
        totalTokensSpent: '0',
        netEnergyWh: 200,
        settlementCount: 5,
        period: {
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        },
      };

      energySettlementService.getSettlementStats.mockResolvedValue(mockStats);

      const result = await controller.getSettlementStats(mockRequest, meterId);

      expect(result).toEqual(mockStats);
      expect(energySettlementService.getSettlementStats).toHaveBeenCalledWith(
        parseInt(meterId),
        expect.any(Date), // Default start date (30 days ago)
        expect.any(Date), // Default end date (now)
      );
    });

    it('should handle invalid meterId parameter', async () => {
      const mockRequest = { user: mockJwtUser };
      const invalidMeterId = 'invalid';

      await expect(
        controller.getSettlementStats(mockRequest, invalidMeterId),
      ).rejects.toThrow('Invalid meter ID');
    });
  });

  describe('POST /energy/settlement/command/:meterId', () => {
    it('should send settlement command successfully', async () => {
      const meterId = '1';
      const mockRequest = { user: mockJwtUser };

      energySettlementService.sendSettlementCommand.mockResolvedValue({
        success: true,
        message: 'Settlement command sent',
      });

      const result = await controller.sendSettlementCommand(
        meterId,
        mockRequest,
      );

      expect(result).toEqual({
        success: true,
        message: 'Settlement command sent to device',
      });

      expect(
        energySettlementService.sendSettlementCommand,
      ).toHaveBeenCalledWith(parseInt(meterId));
    });

    it('should handle command send failures', async () => {
      const meterId = '1';
      const mockRequest = { user: mockJwtUser };

      energySettlementService.sendSettlementCommand.mockRejectedValue(
        new Error('Command failed'),
      );

      await expect(
        controller.sendSettlementCommand(meterId, mockRequest),
      ).rejects.toThrow('Command failed');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should use JWT authentication guard', () => {
      const guards = Reflect.getMetadata('__guards__', EnergyController);
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should extract user information from request', async () => {
      const mockRequest = {
        user: {
          ...mockJwtUser,
          prosumerId: 'different-id',
        },
      };

      energySettlementService.manualSettlement.mockResolvedValue({
        success: true,
        transactionHash: '0x123',
      });

      await controller.manualSettlement('1', mockRequest);

      expect(energySettlementService.manualSettlement).toHaveBeenCalledWith(
        '1',
        'different-id',
      );
    });
  });

  describe('Parameter Validation', () => {
    it('should validate meterId parameter format', async () => {
      const invalidMeterId = '';
      const mockRequest = { user: mockJwtUser };

      await expect(
        controller.manualSettlement(invalidMeterId, mockRequest),
      ).rejects.toThrow();
    });

    it('should handle numeric string parameters correctly', async () => {
      const numericMeterId = '123';
      const mockRequest = { user: mockJwtUser };

      energySettlementService.sendSettlementCommand.mockResolvedValue({
        success: true,
        message: 'Command sent',
      });

      await controller.sendSettlementCommand(numericMeterId, mockRequest);

      expect(
        energySettlementService.sendSettlementCommand,
      ).toHaveBeenCalledWith(123);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service layer errors', async () => {
      const mockRequest = { user: mockJwtUser };

      energySettlementService.processAllMetersSettlement.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        controller.processAllSettlements(mockRequest),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle malformed request data', async () => {
      const mockRequest = { user: null };

      await expect(
        controller.manualSettlement('1', mockRequest),
      ).rejects.toThrow();
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format for manual settlement', async () => {
      const mockRequest = { user: mockJwtUser };

      energySettlementService.manualSettlement.mockResolvedValue({
        success: true,
        transactionHash: '0xabc123',
      });

      const result = await controller.manualSettlement('1', mockRequest);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('transactionHash');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should return consistent response format for process all settlements', async () => {
      const mockRequest = { user: mockJwtUser };

      energySettlementService.processAllMetersSettlement.mockResolvedValue();

      const result = await controller.processAllSettlements(mockRequest);

      expect(result).toEqual({
        success: true,
        message: 'Settlement processing initiated for all meters',
      });
    });
  });
});
