import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { HealthCheckService } from '../health-check.service';
import { TransactionLogsService } from '../../graphql/TransactionLogs/TransactionLogs.service';
import { DeviceHeartbeatsService } from '../../graphql/DeviceHeartbeats/DeviceHeartbeats.service';
import { DeviceCommandsService } from '../../graphql/DeviceCommands/DeviceCommands.service';
import { TransactionStatus, DeviceCommandStatus } from '../../common/enums';

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  let module: TestingModule;
  let configService: jest.Mocked<ConfigService>;
  let transactionLogsService: jest.Mocked<TransactionLogsService>;
  let deviceHeartbeatsService: jest.Mocked<DeviceHeartbeatsService>;
  let deviceCommandsService: jest.Mocked<DeviceCommandsService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config = {
          HEALTH_CHECK_INTERVAL: '60000',
          TRANSACTION_TIMEOUT_MINUTES: '30',
          COMMAND_TIMEOUT_MINUTES: '15',
          MAX_PENDING_TRANSACTIONS: '100',
        };
        return config[key];
      }),
    };

    const mockTransactionLogsService = {
      findAll: jest.fn(),
      findByStatus: jest.fn(),
      findPendingTransactions: jest.fn(),
      updateStatus: jest.fn(),
      findTimedOutTransactions: jest.fn(),
      create: jest.fn(),
    };

    const mockDeviceHeartbeatsService = {
      findLatestByDevice: jest.fn(),
      findStaleHeartbeats: jest.fn(),
      getDeviceHealthStatus: jest.fn(),
    };

    const mockDeviceCommandsService = {
      findPendingCommands: jest.fn(),
      findTimedOutCommands: jest.fn(),
      updateCommandStatus: jest.fn(),
      create: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        HealthCheckService,
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: TransactionLogsService,
          useValue: mockTransactionLogsService,
        },
        {
          provide: DeviceHeartbeatsService,
          useValue: mockDeviceHeartbeatsService,
        },
        { provide: DeviceCommandsService, useValue: mockDeviceCommandsService },
      ],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
    configService = module.get(ConfigService);
    transactionLogsService = module.get(TransactionLogsService);
    deviceHeartbeatsService = module.get(DeviceHeartbeatsService);
    deviceCommandsService = module.get(DeviceCommandsService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
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

  describe('performHealthCheck', () => {
    it('should complete health check successfully', async () => {
      transactionLogsService.findAll.mockResolvedValue([]);
      transactionLogsService.findPendingTransactions.mockResolvedValue([]);
      deviceCommandsService.findTimedOutCommands.mockResolvedValue([]);

      await service.performHealthCheck();

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Health check completed successfully',
      );
    });

    it('should handle health check failures', async () => {
      transactionLogsService.findAll.mockRejectedValue(
        new Error('Database error'),
      );

      await service.performHealthCheck();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Health check failed:',
        expect.any(Error),
      );
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should pass database health check', async () => {
      transactionLogsService.findAll.mockResolvedValue([]);

      await (service as any).checkDatabaseHealth();

      expect(transactionLogsService.findAll).toHaveBeenCalled();
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        'Database health check passed',
      );
    });

    it('should fail database health check on connection error', async () => {
      transactionLogsService.findAll.mockRejectedValue(
        new Error('Connection failed'),
      );

      await expect((service as any).checkDatabaseHealth()).rejects.toThrow(
        'Database connection failed',
      );

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Database health check failed:',
        expect.any(Error),
      );
    });
  });

  describe('checkPendingTransactions', () => {
    it('should handle normal number of pending transactions', async () => {
      const mockTransactions = [
        {
          id: 1,
          status: TransactionStatus.PENDING,
          createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
          description: 'PENDING transaction',
        },
        {
          id: 2,
          status: TransactionStatus.PENDING,
          createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          description: 'PENDING transaction',
        },
      ];

      transactionLogsService.findAll.mockResolvedValue(mockTransactions);

      await (service as any).checkPendingTransactions();

      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        'Found 2 pending transactions',
      );
    });

    it('should warn about excessive pending transactions', async () => {
      const mockTransactions = Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        status: TransactionStatus.PENDING,
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
        description: 'PENDING transaction',
      }));

      transactionLogsService.findAll.mockResolvedValue(mockTransactions);

      await (service as any).checkPendingTransactions();

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'High number of pending transactions: 150',
      );
    });

    it('should handle timed out transactions', async () => {
      const timedOutTransaction = {
        id: 1,
        status: TransactionStatus.PENDING,
        createdAt: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
        description: 'PENDING transaction',
      };

      transactionLogsService.findAll.mockResolvedValue([timedOutTransaction]);
      transactionLogsService.updateStatus.mockResolvedValue({} as any);

      await (service as any).checkPendingTransactions();

      expect(transactionLogsService.updateStatus).toHaveBeenCalledWith(
        1,
        TransactionStatus.FAILED,
      );
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Transaction 1 timed out and marked as failed',
      );
    });
  });

  describe('checkCommandTimeouts', () => {
    it('should handle normal pending commands', async () => {
      const mockCommands = [
        {
          id: 1,
          status: DeviceCommandStatus.PENDING,
          createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        },
        {
          id: 2,
          status: DeviceCommandStatus.SENT,
          createdAt: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
        },
      ];

      deviceCommandsService.findPendingCommands.mockResolvedValue(mockCommands);
      deviceCommandsService.findTimedOutCommands.mockResolvedValue([]);

      await (service as any).checkCommandTimeouts();

      expect(deviceCommandsService.findPendingCommands).toHaveBeenCalled();
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        'Found 2 pending device commands',
      );
    });

    it('should handle timed out commands', async () => {
      const timedOutCommand = {
        id: 1,
        deviceId: 'SM001',
        status: DeviceCommandStatus.SENT,
        createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      };

      deviceCommandsService.findPendingCommands.mockResolvedValue([]);
      deviceCommandsService.findTimedOutCommands.mockResolvedValue([
        timedOutCommand,
      ]);
      deviceCommandsService.updateCommandStatus.mockResolvedValue({} as any);

      await (service as any).checkCommandTimeouts();

      expect(deviceCommandsService.updateCommandStatus).toHaveBeenCalledWith(
        1,
        DeviceCommandStatus.TIMEOUT,
      );
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Device command 1 for device SM001 timed out',
      );
    });
  });

  describe('getSystemHealth', () => {
    it('should return comprehensive system health status', async () => {
      // Mock healthy state
      transactionLogsService.findAll.mockResolvedValue([]);
      transactionLogsService.findPendingTransactions.mockResolvedValue([]);
      deviceCommandsService.findPendingCommands.mockResolvedValue([]);
      deviceHeartbeatsService.getDeviceHealthStatus.mockResolvedValue({
        totalDevices: 5,
        onlineDevices: 5,
        offlineDevices: 0,
      });

      const result = await service.getSystemHealth();

      expect(result).toEqual({
        status: 'healthy',
        timestamp: expect.any(Date),
        checks: {
          database: {
            status: 'healthy',
            responseTime: expect.any(Number),
            lastCheck: expect.any(Date),
          },
          transactions: {
            status: 'healthy',
            pendingCount: 0,
            timedOutCount: 0,
            lastCheck: expect.any(Date),
          },
          devices: {
            status: 'healthy',
            totalDevices: 5,
            onlineDevices: 5,
            offlineDevices: 0,
            lastCheck: expect.any(Date),
          },
          commands: {
            status: 'healthy',
            pendingCount: 0,
            timedOutCount: 0,
            lastCheck: expect.any(Date),
          },
        },
        uptime: expect.any(Number),
        version: expect.any(String),
      });
    });

    it('should return degraded status when issues detected', async () => {
      // Mock degraded state
      const mockPendingTransactions = Array.from({ length: 120 }, (_, i) => ({
        id: i + 1,
        status: TransactionStatus.PENDING,
      }));

      transactionLogsService.findAll.mockResolvedValue(mockPendingTransactions);
      transactionLogsService.findPendingTransactions.mockResolvedValue(
        mockPendingTransactions,
      );
      deviceCommandsService.findPendingCommands.mockResolvedValue([]);
      deviceHeartbeatsService.getDeviceHealthStatus.mockResolvedValue({
        totalDevices: 5,
        onlineDevices: 3,
        offlineDevices: 2,
      });

      const result = await service.getSystemHealth();

      expect(result.status).toBe('degraded');
      expect(result.checks.transactions.status).toBe('warning');
      expect(result.checks.devices.status).toBe('warning');
    });

    it('should return unhealthy status on critical failures', async () => {
      transactionLogsService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = await service.getSystemHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('unhealthy');
    });
  });

  describe('getDetailedHealthReport', () => {
    it('should return detailed health report', async () => {
      transactionLogsService.findAll.mockResolvedValue([]);
      transactionLogsService.findPendingTransactions.mockResolvedValue([]);
      deviceCommandsService.findPendingCommands.mockResolvedValue([]);
      deviceHeartbeatsService.getDeviceHealthStatus.mockResolvedValue({
        totalDevices: 3,
        onlineDevices: 3,
        offlineDevices: 0,
      });

      const result = await service.getDetailedHealthReport();

      expect(result).toEqual({
        summary: expect.objectContaining({
          status: 'healthy',
          timestamp: expect.any(Date),
        }),
        metrics: expect.objectContaining({
          database: expect.objectContaining({
            connectionPool: expect.any(Object),
            queryPerformance: expect.any(Object),
          }),
          transactions: expect.objectContaining({
            throughput: expect.any(Object),
            errorRate: expect.any(Object),
          }),
          devices: expect.objectContaining({
            connectivity: expect.any(Object),
            performance: expect.any(Object),
          }),
        }),
        alerts: expect.any(Array),
        recommendations: expect.any(Array),
      });
    });
  });

  describe('Error Recovery', () => {
    it('should attempt error recovery for failed transactions', async () => {
      const failedTransaction = {
        id: 1,
        status: TransactionStatus.FAILED,
        retryCount: 0,
        canRetry: true,
      };

      await service.attemptErrorRecovery(failedTransaction);

      expect(transactionLogsService.updateStatus).toHaveBeenCalledWith(
        1,
        TransactionStatus.PENDING,
      );
    });

    it('should not retry transactions that exceed retry limit', async () => {
      const failedTransaction = {
        id: 1,
        status: TransactionStatus.FAILED,
        retryCount: 3,
        canRetry: false,
      };

      await service.attemptErrorRecovery(failedTransaction);

      expect(transactionLogsService.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track database response times', async () => {
      const startTime = Date.now();
      transactionLogsService.findAll.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate 100ms delay
        return [];
      });

      await (service as any).checkDatabaseHealth();

      const responseTime = (service as any).getLastDatabaseResponseTime();
      expect(responseTime).toBeGreaterThanOrEqual(100);
    });

    it('should monitor transaction throughput', async () => {
      const transactions = [
        { id: 1, createdAt: new Date(Date.now() - 60000) },
        { id: 2, createdAt: new Date(Date.now() - 30000) },
        { id: 3, createdAt: new Date() },
      ];

      transactionLogsService.findAll.mockResolvedValue(transactions);

      const throughput = await (
        service as any
      ).calculateTransactionThroughput();

      expect(throughput).toEqual({
        transactionsPerMinute: expect.any(Number),
        transactionsPerHour: expect.any(Number),
        averageProcessingTime: expect.any(Number),
      });
    });
  });

  describe('Alerting', () => {
    it('should generate alerts for critical issues', async () => {
      const alerts = await (service as any).generateAlerts({
        database: { status: 'unhealthy' },
        transactions: { status: 'warning', pendingCount: 150 },
        devices: { status: 'healthy' },
        commands: { status: 'healthy' },
      });

      expect(alerts).toEqual([
        {
          level: 'critical',
          component: 'database',
          message: 'Database health check failed',
          timestamp: expect.any(Date),
        },
        {
          level: 'warning',
          component: 'transactions',
          message: 'High number of pending transactions: 150',
          timestamp: expect.any(Date),
        },
      ]);
    });

    it('should provide recommendations for improvements', async () => {
      const recommendations = await (service as any).generateRecommendations({
        database: { status: 'healthy', responseTime: 500 },
        transactions: { status: 'warning', pendingCount: 80 },
        devices: { status: 'healthy', offlineDevices: 1 },
      });

      expect(recommendations).toContain(
        'Consider optimizing database queries (response time: 500ms)',
      );
      expect(recommendations).toContain(
        'Monitor transaction processing capacity',
      );
    });
  });

  describe('Configuration', () => {
    it('should use configured timeout values', () => {
      expect(configService.get).toHaveBeenCalledWith(
        'TRANSACTION_TIMEOUT_MINUTES',
      );
      expect(configService.get).toHaveBeenCalledWith('COMMAND_TIMEOUT_MINUTES');
    });

    it('should allow runtime configuration updates', () => {
      const newConfig = {
        transactionTimeout: 45,
        commandTimeout: 20,
        maxPendingTransactions: 150,
      };

      (service as any).updateConfiguration(newConfig);

      expect((service as any).config.transactionTimeout).toBe(45);
      expect((service as any).config.commandTimeout).toBe(20);
      expect((service as any).config.maxPendingTransactions).toBe(150);
    });
  });
});
