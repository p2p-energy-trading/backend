import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DeviceMonitoringService } from '../device-monitoring.service';
import { SmartMetersService } from '../../graphql/SmartMeters/SmartMeters.service';
import { DeviceHeartbeatsService } from '../../graphql/DeviceHeartbeats/DeviceHeartbeats.service';
import { TransactionLogsService } from '../../graphql/TransactionLogs/TransactionLogs.service';
import { TransactionType } from '../../common/enums';
import {
  createMockSmartMeter,
  createMockHeartbeat,
  createMockDeviceStatus,
} from '../../test-setup';

describe('DeviceMonitoringService', () => {
  let service: DeviceMonitoringService;
  let module: TestingModule;
  let smartMetersService: jest.Mocked<SmartMetersService>;
  let deviceHeartbeatsService: jest.Mocked<DeviceHeartbeatsService>;
  let transactionLogsService: jest.Mocked<TransactionLogsService>;

  beforeEach(async () => {
    const mockSmartMetersService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySerialNumber: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      findByUserId: jest.fn(),
    };

    const mockDeviceHeartbeatsService = {
      create: jest.fn(),
      findByDeviceId: jest.fn(),
      findLatestByDevice: jest.fn(),
      getDeviceUptime: jest.fn(),
      findByDateRange: jest.fn(),
    };

    const mockTransactionLogsService = {
      create: jest.fn(),
      findByType: jest.fn(),
      findByDeviceId: jest.fn(),
      updateStatus: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        DeviceMonitoringService,
        { provide: SmartMetersService, useValue: mockSmartMetersService },
        {
          provide: DeviceHeartbeatsService,
          useValue: mockDeviceHeartbeatsService,
        },
        {
          provide: TransactionLogsService,
          useValue: mockTransactionLogsService,
        },
      ],
    }).compile();

    service = module.get<DeviceMonitoringService>(DeviceMonitoringService);
    smartMetersService = module.get(SmartMetersService);
    deviceHeartbeatsService = module.get(DeviceHeartbeatsService);
    transactionLogsService = module.get(TransactionLogsService);

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

  describe('monitorDeviceHealth', () => {
    it('should monitor health of all active devices', async () => {
      const mockDevices = [
        createMockSmartMeter({
          id: 1,
          serialNumber: 'SM001',
          status: 'ACTIVE',
        }),
        createMockSmartMeter({
          id: 2,
          serialNumber: 'SM002',
          status: 'ACTIVE',
        }),
      ];

      smartMetersService.findAll.mockResolvedValue(mockDevices);
      jest.spyOn(service, 'checkDeviceHealth').mockResolvedValue();

      await service.monitorDeviceHealth();

      expect(smartMetersService.findAll).toHaveBeenCalledWith({
        status: 'ACTIVE',
      });
      expect(service.checkDeviceHealth).toHaveBeenCalledTimes(2);
      expect(service.checkDeviceHealth).toHaveBeenCalledWith('SM001');
      expect(service.checkDeviceHealth).toHaveBeenCalledWith('SM002');
    });

    it('should handle errors during device monitoring', async () => {
      const mockDevices = [
        createMockSmartMeter({
          id: 1,
          serialNumber: 'SM001',
          status: 'ACTIVE',
        }),
      ];

      smartMetersService.findAll.mockResolvedValue(mockDevices);
      jest
        .spyOn(service, 'checkDeviceHealth')
        .mockRejectedValue(new Error('Health check failed'));

      await service.monitorDeviceHealth();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error monitoring device health'),
      );
    });
  });

  describe('checkDeviceHealth', () => {
    const meterId = 'SM001';
    const mockDevice = createMockSmartMeter({
      id: 1,
      serialNumber: meterId,
      status: 'ACTIVE',
    });

    beforeEach(() => {
      smartMetersService.findBySerialNumber.mockResolvedValue(mockDevice);
    });

    it('should identify healthy device', async () => {
      const recentHeartbeat = createMockHeartbeat({
        deviceId: meterId,
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        status: 'ONLINE',
        batteryLevel: 85,
        signalStrength: -45,
      });

      deviceHeartbeatsService.findLatestByDevice.mockResolvedValue(
        recentHeartbeat,
      );
      deviceHeartbeatsService.getDeviceUptime.mockResolvedValue(86400); // 24 hours

      const result = await service.checkDeviceHealth(meterId);

      expect(result).toEqual({
        meterId,
        isOnline: true,
        lastHeartbeat: recentHeartbeat.timestamp.toISOString(),
        uptimeSeconds: 86400,
        signalStrength: -45,
        batteryLevel: 85,
        errorCodes: [],
        alerts: [],
      });
    });

    it('should identify offline device', async () => {
      const oldHeartbeat = createMockHeartbeat({
        deviceId: meterId,
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        status: 'OFFLINE',
        batteryLevel: 75,
        signalStrength: -55,
      });

      deviceHeartbeatsService.findLatestByDevice.mockResolvedValue(
        oldHeartbeat,
      );
      deviceHeartbeatsService.getDeviceUptime.mockResolvedValue(0);

      const result = await service.checkDeviceHealth(meterId);

      expect(result).toEqual({
        meterId,
        isOnline: false,
        lastHeartbeat: oldHeartbeat.timestamp.toISOString(),
        uptimeSeconds: 0,
        signalStrength: -55,
        batteryLevel: 75,
        errorCodes: [],
        alerts: ['Device has been offline for more than 10 minutes'],
      });
    });

    it('should detect low battery alert', async () => {
      const heartbeatWithLowBattery = createMockHeartbeat({
        deviceId: meterId,
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        status: 'ONLINE',
        batteryLevel: 15, // Below threshold
        signalStrength: -45,
      });

      deviceHeartbeatsService.findLatestByDevice.mockResolvedValue(
        heartbeatWithLowBattery,
      );
      deviceHeartbeatsService.getDeviceUptime.mockResolvedValue(86400);

      const result = await service.checkDeviceHealth(meterId);

      expect(result.alerts).toContain('Low battery level: 15%');
    });

    it('should detect weak signal alert', async () => {
      const heartbeatWithWeakSignal = createMockHeartbeat({
        deviceId: meterId,
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        status: 'ONLINE',
        batteryLevel: 85,
        signalStrength: -85, // Below threshold
      });

      deviceHeartbeatsService.findLatestByDevice.mockResolvedValue(
        heartbeatWithWeakSignal,
      );
      deviceHeartbeatsService.getDeviceUptime.mockResolvedValue(86400);

      const result = await service.checkDeviceHealth(meterId);

      expect(result.alerts).toContain('Weak signal strength: -85 dBm');
    });

    it('should handle device not found', async () => {
      smartMetersService.findBySerialNumber.mockResolvedValue(null);

      await expect(service.checkDeviceHealth(meterId)).rejects.toThrow(
        'Device not found',
      );
    });

    it('should handle missing heartbeat data', async () => {
      deviceHeartbeatsService.findLatestByDevice.mockResolvedValue(null);

      const result = await service.checkDeviceHealth(meterId);

      expect(result).toEqual({
        meterId,
        isOnline: false,
        lastHeartbeat: null,
        uptimeSeconds: 0,
        signalStrength: 0,
        batteryLevel: undefined,
        errorCodes: [],
        alerts: ['No heartbeat data available'],
      });
    });
  });

  describe('getDeviceHealthSummary', () => {
    it('should return health summary for user devices', async () => {
      const userId = 1;
      const mockDevices = [
        createMockSmartMeter({ id: 1, serialNumber: 'SM001', userId }),
        createMockSmartMeter({ id: 2, serialNumber: 'SM002', userId }),
      ];

      smartMetersService.findByUserId.mockResolvedValue(mockDevices);

      jest
        .spyOn(service, 'checkDeviceHealth')
        .mockResolvedValueOnce({
          meterId: 'SM001',
          isOnline: true,
          lastHeartbeat: new Date().toISOString(),
          uptimeSeconds: 86400,
          signalStrength: -45,
          batteryLevel: 85,
          errorCodes: [],
          alerts: [],
        })
        .mockResolvedValueOnce({
          meterId: 'SM002',
          isOnline: false,
          lastHeartbeat: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          uptimeSeconds: 0,
          signalStrength: -90,
          batteryLevel: 15,
          errorCodes: ['ERR_001'],
          alerts: ['Device offline', 'Low battery'],
        });

      const result = await service.getDeviceHealthSummary(userId);

      expect(result).toEqual({
        totalDevices: 2,
        onlineDevices: 1,
        offlineDevices: 1,
        devicesWithAlerts: 1,
        devices: [
          {
            meterId: 'SM001',
            isOnline: true,
            lastHeartbeat: expect.any(String),
            uptimeSeconds: 86400,
            signalStrength: -45,
            batteryLevel: 85,
            errorCodes: [],
            alerts: [],
          },
          {
            meterId: 'SM002',
            isOnline: false,
            lastHeartbeat: expect.any(String),
            uptimeSeconds: 0,
            signalStrength: -90,
            batteryLevel: 15,
            errorCodes: ['ERR_001'],
            alerts: ['Device offline', 'Low battery'],
          },
        ],
      });
    });

    it('should handle user with no devices', async () => {
      const userId = 1;
      smartMetersService.findByUserId.mockResolvedValue([]);

      const result = await service.getDeviceHealthSummary(userId);

      expect(result).toEqual({
        totalDevices: 0,
        onlineDevices: 0,
        offlineDevices: 0,
        devicesWithAlerts: 0,
        devices: [],
      });
    });
  });

  describe('getDeviceAlerts', () => {
    it('should return current alerts for a device', async () => {
      const meterId = 'SM001';

      jest.spyOn(service, 'checkDeviceHealth').mockResolvedValue({
        meterId,
        isOnline: false,
        lastHeartbeat: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        uptimeSeconds: 0,
        signalStrength: -90,
        batteryLevel: 15,
        errorCodes: ['ERR_001', 'ERR_002'],
        alerts: ['Device offline', 'Low battery', 'Weak signal'],
      });

      const result = await service.getDeviceAlerts(meterId);

      expect(result).toEqual([
        {
          id: expect.any(String),
          meterId,
          alertType: 'OFFLINE',
          message: 'Device offline',
          timestamp: expect.any(String),
        },
        {
          id: expect.any(String),
          meterId,
          alertType: 'LOW_BATTERY',
          message: 'Low battery',
          timestamp: expect.any(String),
        },
        {
          id: expect.any(String),
          meterId,
          alertType: 'WEAK_SIGNAL',
          message: 'Weak signal',
          timestamp: expect.any(String),
        },
      ]);
    });

    it('should return empty alerts for healthy device', async () => {
      const meterId = 'SM001';

      jest.spyOn(service, 'checkDeviceHealth').mockResolvedValue({
        meterId,
        isOnline: true,
        lastHeartbeat: new Date().toISOString(),
        uptimeSeconds: 86400,
        signalStrength: -45,
        batteryLevel: 85,
        errorCodes: [],
        alerts: [],
      });

      const result = await service.getDeviceAlerts(meterId);

      expect(result).toEqual([]);
    });
  });

  describe('getDeviceUptimeStats', () => {
    it('should return uptime statistics for a device', async () => {
      const meterId = 'SM001';
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-14');

      const mockHeartbeats = [
        createMockHeartbeat({
          deviceId: meterId,
          timestamp: new Date('2025-06-01T12:00:00Z'),
          status: 'ONLINE',
        }),
        createMockHeartbeat({
          deviceId: meterId,
          timestamp: new Date('2025-06-02T12:00:00Z'),
          status: 'ONLINE',
        }),
        createMockHeartbeat({
          deviceId: meterId,
          timestamp: new Date('2025-06-03T12:00:00Z'),
          status: 'OFFLINE',
        }),
      ];

      deviceHeartbeatsService.findByDateRange.mockResolvedValue(mockHeartbeats);

      const result = await service.getDeviceUptimeStats(
        meterId,
        startDate,
        endDate,
      );

      expect(result).toEqual({
        meterId,
        period: {
          startDate,
          endDate,
        },
        totalHours: expect.any(Number),
        onlineHours: expect.any(Number),
        offlineHours: expect.any(Number),
        uptimePercentage: expect.any(Number),
        downtimeEvents: expect.any(Number),
        averageUptimeHours: expect.any(Number),
      });

      expect(deviceHeartbeatsService.findByDateRange).toHaveBeenCalledWith(
        meterId,
        startDate,
        endDate,
      );
    });
  });

  describe('sendMaintenanceAlert', () => {
    it('should send maintenance alert for device', async () => {
      const meterId = 'SM001';
      const alertType = 'SCHEDULED_MAINTENANCE';
      const message = 'Device SM001 requires scheduled maintenance';

      transactionLogsService.create.mockResolvedValue({ id: 1 } as any);

      await service.sendMaintenanceAlert(meterId, alertType, message);

      expect(transactionLogsService.create).toHaveBeenCalledWith({
        type: TransactionType.DEVICE_MAINTENANCE,
        deviceId: meterId,
        description: message,
        status: 'PENDING',
        metadata: {
          alertType,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      smartMetersService.findAll.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await service.monitorDeviceHealth();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error monitoring device health'),
      );
    });

    it('should handle individual device check failures', async () => {
      const userId = 1;
      const mockDevices = [
        createMockSmartMeter({ id: 1, serialNumber: 'SM001', userId }),
        createMockSmartMeter({ id: 2, serialNumber: 'SM002', userId }),
      ];

      smartMetersService.findByUserId.mockResolvedValue(mockDevices);

      jest
        .spyOn(service, 'checkDeviceHealth')
        .mockResolvedValueOnce({
          meterId: 'SM001',
          isOnline: true,
          lastHeartbeat: new Date().toISOString(),
          uptimeSeconds: 86400,
          signalStrength: -45,
          batteryLevel: 85,
          errorCodes: [],
          alerts: [],
        })
        .mockRejectedValueOnce(new Error('Device check failed'));

      const result = await service.getDeviceHealthSummary(userId);

      expect(result.totalDevices).toBe(1); // Only successful checks included
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error checking device health'),
      );
    });
  });

  describe('Alert Classification', () => {
    it('should correctly classify different alert types', () => {
      const alerts = [
        'Device has been offline for more than 10 minutes',
        'Low battery level: 15%',
        'Weak signal strength: -85 dBm',
        'Device temperature too high: 65°C',
        'Memory usage critical: 95%',
      ];

      const classifiedAlerts = (service as any).classifyAlerts(alerts);

      expect(classifiedAlerts).toEqual([
        {
          type: 'OFFLINE',
          message: 'Device has been offline for more than 10 minutes',
        },
        { type: 'LOW_BATTERY', message: 'Low battery level: 15%' },
        { type: 'WEAK_SIGNAL', message: 'Weak signal strength: -85 dBm' },
        {
          type: 'HIGH_TEMPERATURE',
          message: 'Device temperature too high: 65°C',
        },
        { type: 'HIGH_MEMORY', message: 'Memory usage critical: 95%' },
      ]);
    });
  });

  describe('Threshold Management', () => {
    it('should use correct thresholds for device health checks', () => {
      expect((service as any).OFFLINE_THRESHOLD_MINUTES).toBe(10);
      expect((service as any).LOW_SIGNAL_THRESHOLD).toBe(-80);
      expect((service as any).LOW_BATTERY_THRESHOLD).toBe(20);
    });

    it('should allow threshold configuration', () => {
      const customThresholds = {
        offlineThreshold: 15,
        lowSignalThreshold: -70,
        lowBatteryThreshold: 25,
      };

      (service as any).updateThresholds(customThresholds);

      expect((service as any).OFFLINE_THRESHOLD_MINUTES).toBe(15);
      expect((service as any).LOW_SIGNAL_THRESHOLD).toBe(-70);
      expect((service as any).LOW_BATTERY_THRESHOLD).toBe(25);
    });
  });
});
