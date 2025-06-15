import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { MqttService } from '../mqtt.service';
import { MqttMessageLogsService } from '../../graphql/MqttMessageLogs/MqttMessageLogs.service';
import { EnergyReadingsService } from '../../graphql/EnergyReadings/EnergyReadings.service';
import { DeviceHeartbeatsService } from '../../graphql/DeviceHeartbeats/DeviceHeartbeats.service';
import { DeviceStatusSnapshotsService } from '../../graphql/DeviceStatusSnapshots/DeviceStatusSnapshots.service';
import { DeviceCommandsService } from '../../graphql/DeviceCommands/DeviceCommands.service';
import { CryptoService } from '../../common/crypto.service';
import {
  MqttTopicType,
  MqttDirection,
  DeviceCommandType,
} from '../../common/enums';
import {
  SensorData,
  DeviceHeartbeat,
  DeviceStatus,
  DeviceCommandPayload,
} from '../../common/interfaces';

// Mock mqtt
const mockMqttClient = {
  connect: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  publish: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  connected: true,
};

jest.mock('mqtt', () => ({
  connect: jest.fn(() => mockMqttClient),
}));

describe('MqttService', () => {
  let service: MqttService;
  let module: TestingModule;
  let configService: jest.Mocked<ConfigService>;
  let mqttMessageLogsService: jest.Mocked<MqttMessageLogsService>;
  let energyReadingsService: jest.Mocked<EnergyReadingsService>;
  let deviceHeartbeatsService: jest.Mocked<DeviceHeartbeatsService>;
  let deviceStatusSnapshotsService: jest.Mocked<DeviceStatusSnapshotsService>;
  let deviceCommandsService: jest.Mocked<DeviceCommandsService>;
  let cryptoService: jest.Mocked<CryptoService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config = {
          MQTT_BROKER_URL: 'mqtt://localhost:1883',
          MQTT_USERNAME: 'test_user',
          MQTT_PASSWORD: 'test_password',
          MQTT_CLIENT_ID: 'enerlink_backend',
          MQTT_CLEAN_SESSION: 'true',
          MQTT_RECONNECT_PERIOD: '1000',
          MQTT_CONNECT_TIMEOUT: '30000',
        };
        return config[key];
      }),
    };

    const mockMqttMessageLogsService = {
      create: jest.fn(),
      findByTopic: jest.fn(),
      findByDirection: jest.fn(),
    };

    const mockEnergyReadingsService = {
      create: jest.fn(),
      findBySmartMeterId: jest.fn(),
      findLatestBySmartMeter: jest.fn(),
    };

    const mockDeviceHeartbeatsService = {
      create: jest.fn(),
      findByDeviceId: jest.fn(),
      findLatestByDevice: jest.fn(),
    };

    const mockDeviceStatusSnapshotsService = {
      create: jest.fn(),
      findByDeviceId: jest.fn(),
      findLatestByDevice: jest.fn(),
    };

    const mockDeviceCommandsService = {
      create: jest.fn(),
      findByDeviceId: jest.fn(),
      updateStatus: jest.fn(),
    };

    const mockCryptoService = {
      generateKeyPair: jest.fn(),
      encryptData: jest.fn(),
      decryptData: jest.fn(),
      hashData: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        MqttService,
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: MqttMessageLogsService,
          useValue: mockMqttMessageLogsService,
        },
        { provide: EnergyReadingsService, useValue: mockEnergyReadingsService },
        {
          provide: DeviceHeartbeatsService,
          useValue: mockDeviceHeartbeatsService,
        },
        {
          provide: DeviceStatusSnapshotsService,
          useValue: mockDeviceStatusSnapshotsService,
        },
        { provide: DeviceCommandsService, useValue: mockDeviceCommandsService },
        { provide: CryptoService, useValue: mockCryptoService },
      ],
    }).compile();

    service = module.get<MqttService>(MqttService);
    configService = module.get(ConfigService);
    mqttMessageLogsService = module.get(MqttMessageLogsService);
    energyReadingsService = module.get(EnergyReadingsService);
    deviceHeartbeatsService = module.get(DeviceHeartbeatsService);
    deviceStatusSnapshotsService = module.get(DeviceStatusSnapshotsService);
    deviceCommandsService = module.get(DeviceCommandsService);
    cryptoService = module.get(CryptoService);

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

    it('should connect to MQTT broker on module init', () => {
      service.onModuleInit();
      expect(mockMqttClient.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(mockMqttClient.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
      expect(mockMqttClient.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
    });

    it('should disconnect from MQTT broker on module destroy', async () => {
      await service.onModuleDestroy();
      expect(mockMqttClient.end).toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    it('should return connection status', () => {
      expect(service.isConnected()).toBe(true);
    });

    it('should handle connection success', () => {
      const connectCallback = mockMqttClient.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )[1];

      connectCallback();

      expect(mockMqttClient.subscribe).toHaveBeenCalledWith([
        'home/energy-monitor/sensors',
        'home/energy-monitor/heartbeat',
        'home/energy-monitor/status',
      ]);
    });

    it('should handle connection errors', () => {
      const errorCallback = mockMqttClient.on.mock.calls.find(
        (call) => call[0] === 'error',
      )[1];

      const error = new Error('Connection failed');
      errorCallback(error);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'MQTT connection error:',
        error,
      );
    });
  });

  describe('Message Publishing', () => {
    beforeEach(() => {
      mockMqttClient.publish.mockImplementation(
        (topic, message, options, callback) => {
          if (callback) callback(null);
          return mockMqttClient;
        },
      );
    });

    describe('publishDeviceCommand', () => {
      it('should publish device command successfully', async () => {
        const deviceId = 'SM001';
        const command: DeviceCommandPayload = {
          command: DeviceCommandType.RESTART_DEVICE,
          parameters: { delay: 5 },
          timestamp: new Date().toISOString(),
          commandId: 'cmd-123',
        };

        deviceCommandsService.create.mockResolvedValue({ id: 1 } as any);
        mqttMessageLogsService.create.mockResolvedValue({ id: 1 } as any);

        await service.publishDeviceCommand(deviceId, command);

        expect(mockMqttClient.publish).toHaveBeenCalledWith(
          'home/energy-monitor/command',
          expect.stringContaining(deviceId),
          { qos: 1, retain: false },
          expect.any(Function),
        );

        expect(deviceCommandsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            deviceId,
            command: command.command,
            parameters: command.parameters,
          }),
        );

        expect(mqttMessageLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            topic: 'home/energy-monitor/command',
            direction: MqttDirection.OUTBOUND,
            topicType: MqttTopicType.COMMAND,
          }),
        );
      });

      it('should handle device command publication failure', async () => {
        const deviceId = 'SM001';
        const command: DeviceCommandPayload = {
          command: DeviceCommandType.RESTART_DEVICE,
          parameters: {},
          timestamp: new Date().toISOString(),
          commandId: 'cmd-123',
        };

        mockMqttClient.publish.mockImplementation(
          (topic, message, options, callback) => {
            if (callback) callback(new Error('Publish failed'));
            return mockMqttClient;
          },
        );

        await expect(
          service.publishDeviceCommand(deviceId, command),
        ).rejects.toThrow('Failed to publish device command');
      });
    });

    describe('publishNotification', () => {
      it('should publish notification successfully', async () => {
        const topic = 'home/energy-monitor/notifications';
        const message = {
          type: 'ALERT',
          content: 'High energy consumption detected',
        };

        mqttMessageLogsService.create.mockResolvedValue({ id: 1 } as any);

        await service.publishNotification(topic, message);

        expect(mockMqttClient.publish).toHaveBeenCalledWith(
          topic,
          JSON.stringify(message),
          { qos: 1, retain: false },
          expect.any(Function),
        );

        expect(mqttMessageLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            topic,
            direction: MqttDirection.OUTBOUND,
            topicType: MqttTopicType.NOTIFICATION,
          }),
        );
      });
    });
  });

  describe('Message Handling', () => {
    let messageCallback: Function;

    beforeEach(() => {
      messageCallback = mockMqttClient.on.mock.calls.find(
        (call) => call[0] === 'message',
      )[1];
    });

    describe('Sensor Data Processing', () => {
      it('should process sensor data message correctly', async () => {
        const sensorData: SensorData = {
          deviceId: 'SM001',
          timestamp: '2025-06-14T10:30:00Z',
          voltage: 230,
          current: 10,
          power: 2300,
          energy: 1150,
          exportEnergyWh: 500,
          importEnergyWh: 1000,
          frequency: 50,
          powerFactor: 0.95,
        };

        energyReadingsService.create.mockResolvedValue({ id: 1 } as any);
        mqttMessageLogsService.create.mockResolvedValue({ id: 1 } as any);

        await messageCallback(
          'home/energy-monitor/sensors',
          JSON.stringify(sensorData),
        );

        expect(energyReadingsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            smartMeterId: sensorData.deviceId,
            voltage: sensorData.voltage,
            current: sensorData.current,
            power: sensorData.power,
            exportEnergyWh: sensorData.exportEnergyWh,
            importEnergyWh: sensorData.importEnergyWh,
          }),
        );

        expect(mqttMessageLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            topic: 'home/energy-monitor/sensors',
            direction: MqttDirection.INBOUND,
            topicType: MqttTopicType.SENSOR_DATA,
          }),
        );
      });

      it('should handle invalid sensor data format', async () => {
        const invalidData = '{"invalid": "data"}';

        await messageCallback('home/energy-monitor/sensors', invalidData);

        expect(energyReadingsService.create).not.toHaveBeenCalled();
        expect(Logger.prototype.error).toHaveBeenCalledWith(
          expect.stringContaining('Error processing sensor data'),
        );
      });
    });

    describe('Heartbeat Processing', () => {
      it('should process heartbeat message correctly', async () => {
        const heartbeatData: DeviceHeartbeat = {
          deviceId: 'SM001',
          timestamp: '2025-06-14T10:30:00Z',
          status: 'ONLINE',
          batteryLevel: 85,
          signalStrength: -45,
          memoryUsage: 60,
          cpuUsage: 25,
          temperature: 35.5,
          uptime: 86400,
        };

        deviceHeartbeatsService.create.mockResolvedValue({ id: 1 } as any);
        mqttMessageLogsService.create.mockResolvedValue({ id: 1 } as any);

        await messageCallback(
          'home/energy-monitor/heartbeat',
          JSON.stringify(heartbeatData),
        );

        expect(deviceHeartbeatsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            deviceId: heartbeatData.deviceId,
            status: heartbeatData.status,
            batteryLevel: heartbeatData.batteryLevel,
            signalStrength: heartbeatData.signalStrength,
          }),
        );

        expect(mqttMessageLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            topic: 'home/energy-monitor/heartbeat',
            direction: MqttDirection.INBOUND,
            topicType: MqttTopicType.HEARTBEAT,
          }),
        );
      });
    });

    describe('Device Status Processing', () => {
      it('should process device status message correctly', async () => {
        const statusData: DeviceStatus = {
          deviceId: 'SM001',
          timestamp: '2025-06-14T10:30:00Z',
          operationalStatus: 'OPERATIONAL',
          errorCodes: [],
          lastMaintenanceDate: '2025-06-01T00:00:00Z',
          firmwareVersion: '1.2.3',
          configurationHash: 'abc123',
          calibrationStatus: 'CALIBRATED',
          networkConnectivity: 'CONNECTED',
        };

        deviceStatusSnapshotsService.create.mockResolvedValue({ id: 1 } as any);
        mqttMessageLogsService.create.mockResolvedValue({ id: 1 } as any);

        await messageCallback(
          'home/energy-monitor/status',
          JSON.stringify(statusData),
        );

        expect(deviceStatusSnapshotsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            deviceId: statusData.deviceId,
            operationalStatus: statusData.operationalStatus,
            errorCodes: statusData.errorCodes,
            firmwareVersion: statusData.firmwareVersion,
          }),
        );

        expect(mqttMessageLogsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            topic: 'home/energy-monitor/status',
            direction: MqttDirection.INBOUND,
            topicType: MqttTopicType.DEVICE_STATUS,
          }),
        );
      });
    });

    it('should handle unknown topic gracefully', async () => {
      const unknownTopic = 'unknown/topic';
      const message = '{"test": "data"}';

      await messageCallback(unknownTopic, message);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown topic'),
      );
    });

    it('should handle JSON parsing errors', async () => {
      const invalidJson = '{invalid json}';

      await messageCallback('home/energy-monitor/sensors', invalidJson);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error parsing MQTT message'),
      );
    });
  });

  describe('Topic Management', () => {
    it('should subscribe to additional topics', () => {
      const newTopic = 'home/energy-monitor/alerts';

      service.subscribeTo(newTopic);

      expect(mockMqttClient.subscribe).toHaveBeenCalledWith(newTopic);
    });

    it('should unsubscribe from topics', () => {
      const topic = 'home/energy-monitor/sensors';

      service.unsubscribeFrom(topic);

      expect(mockMqttClient.unsubscribe).toHaveBeenCalledWith(topic);
    });

    it('should get subscribed topics', () => {
      const topics = service.getSubscribedTopics();

      expect(topics).toEqual([
        'home/energy-monitor/sensors',
        'home/energy-monitor/heartbeat',
        'home/energy-monitor/status',
      ]);
    });
  });

  describe('Message Logging', () => {
    it('should log inbound messages', async () => {
      const topic = 'home/energy-monitor/sensors';
      const message = '{"deviceId": "SM001", "power": 1000}';

      mqttMessageLogsService.create.mockResolvedValue({ id: 1 } as any);

      await (service as any).logMessage(
        topic,
        message,
        MqttDirection.INBOUND,
        MqttTopicType.SENSOR_DATA,
      );

      expect(mqttMessageLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          topic,
          payload: message,
          direction: MqttDirection.INBOUND,
          topicType: MqttTopicType.SENSOR_DATA,
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should log outbound messages', async () => {
      const topic = 'home/energy-monitor/command';
      const message = '{"command": "RESTART", "deviceId": "SM001"}';

      mqttMessageLogsService.create.mockResolvedValue({ id: 1 } as any);

      await (service as any).logMessage(
        topic,
        message,
        MqttDirection.OUTBOUND,
        MqttTopicType.COMMAND,
      );

      expect(mqttMessageLogsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          topic,
          payload: message,
          direction: MqttDirection.OUTBOUND,
          topicType: MqttTopicType.COMMAND,
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors when creating energy readings', async () => {
      const sensorData: SensorData = {
        deviceId: 'SM001',
        timestamp: '2025-06-14T10:30:00Z',
        voltage: 230,
        current: 10,
        power: 2300,
        energy: 1150,
        exportEnergyWh: 500,
        importEnergyWh: 1000,
        frequency: 50,
        powerFactor: 0.95,
      };

      energyReadingsService.create.mockRejectedValue(
        new Error('Database error'),
      );

      const messageCallback = mockMqttClient.on.mock.calls.find(
        (call) => call[0] === 'message',
      )[1];

      await messageCallback(
        'home/energy-monitor/sensors',
        JSON.stringify(sensorData),
      );

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing sensor data'),
      );
    });

    it('should handle MQTT client not connected error', async () => {
      mockMqttClient.connected = false;

      const command: DeviceCommandPayload = {
        command: DeviceCommandType.RESTART_DEVICE,
        parameters: {},
        timestamp: new Date().toISOString(),
        commandId: 'cmd-123',
      };

      await expect(
        service.publishDeviceCommand('SM001', command),
      ).rejects.toThrow('MQTT client not connected');
    });

    it('should handle message logging failures gracefully', async () => {
      mqttMessageLogsService.create.mockRejectedValue(
        new Error('Logging failed'),
      );

      const topic = 'home/energy-monitor/sensors';
      const message = '{"test": "data"}';

      await (service as any).logMessage(
        topic,
        message,
        MqttDirection.INBOUND,
        MqttTopicType.SENSOR_DATA,
      );

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log MQTT message'),
      );
    });
  });

  describe('Data Validation', () => {
    it('should validate sensor data structure', () => {
      const validData = {
        deviceId: 'SM001',
        timestamp: '2025-06-14T10:30:00Z',
        voltage: 230,
        current: 10,
        power: 2300,
        energy: 1150,
        exportEnergyWh: 500,
        importEnergyWh: 1000,
        frequency: 50,
        powerFactor: 0.95,
      };

      const isValid = (service as any).validateSensorData(validData);
      expect(isValid).toBe(true);
    });

    it('should reject invalid sensor data', () => {
      const invalidData = {
        deviceId: 'SM001',
        // Missing required fields
      };

      const isValid = (service as any).validateSensorData(invalidData);
      expect(isValid).toBe(false);
    });

    it('should validate heartbeat data structure', () => {
      const validData = {
        deviceId: 'SM001',
        timestamp: '2025-06-14T10:30:00Z',
        status: 'ONLINE',
        batteryLevel: 85,
      };

      const isValid = (service as any).validateHeartbeatData(validData);
      expect(isValid).toBe(true);
    });
  });
});
