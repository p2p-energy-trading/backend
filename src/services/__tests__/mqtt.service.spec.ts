import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MqttService } from '../mqtt.service';
import { MqttMessageLogsService } from '../../models/MqttMessageLogs/MqttMessageLogs.service';
import { EnergyReadingsService } from '../../models/EnergyReadings/EnergyReadings.service';
import { DeviceHeartbeatsService } from '../../models/DeviceHeartbeats/DeviceHeartbeats.service';
import { DeviceStatusSnapshotsService } from '../../models/DeviceStatusSnapshots/DeviceStatusSnapshots.service';
import { DeviceCommandsService } from '../../models/DeviceCommands/DeviceCommands.service';
import { CryptoService } from '../../common/crypto.service';
import * as mqtt from 'mqtt';

jest.mock('mqtt');

describe('MqttService', () => {
  let service: MqttService;
  let mockClient: jest.Mocked<{
    on: jest.Mock;
    subscribe: jest.Mock;
    publish: jest.Mock;
    end: jest.Mock;
  }>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        MQTT_BROKER_URL: 'mqtt://localhost:1883',
        MQTT_CLIENT_ID: 'test-client',
        MQTT_USERNAME: 'test-user',
        MQTT_PASSWORD: 'test-pass',
      };
      return config[key];
    }),
  };

  const mockMqttMessageLogsService = {
    create: jest.fn(),
  };

  const mockEnergyReadingsService = {
    create: jest.fn(),
  };

  const mockDeviceHeartbeatsService = {
    create: jest.fn(),
  };

  const mockDeviceStatusSnapshotsService = {
    create: jest.fn(),
  };

  const mockDeviceCommandsService = {
    create: jest.fn(),
  };

  const mockCryptoService = {
    generateCorrelationId: jest.fn(() => 'test-correlation-id'),
  };

  beforeEach(async () => {
    mockClient = {
      on: jest.fn(),
      subscribe: jest.fn(),
      publish: jest.fn(),
      end: jest.fn(),
    };

    (mqtt.connect as jest.Mock).mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect to MQTT broker on module init', () => {
    service.onModuleInit();

    expect(mqtt.connect).toHaveBeenCalledWith('mqtt://localhost:1883', {
      clientId: 'test-client',
      clean: true,
      keepalive: 60,
      username: 'test-user',
      password: 'test-pass',
    });
  });

  it('should end MQTT connection on module destroy', () => {
    service.onModuleInit();
    service.onModuleDestroy();

    expect(mockClient.end).toHaveBeenCalled();
  });

  it('should send command with correlation ID', async () => {
    service.onModuleInit();

    const command = { grid: 'export' as const };
    const meterId = 'METER001';

    const correlationId = await service.sendCommand(meterId, command);

    expect(correlationId).toBe('test-correlation-id');
    expect(mockDeviceCommandsService.create).toHaveBeenCalled();
    expect(mockMqttMessageLogsService.create).toHaveBeenCalled();
    expect(mockClient.publish).toHaveBeenCalledWith(
      'home/energy-monitor/command/METER001',
      expect.stringContaining('test-correlation-id'),
      { qos: 1 },
      expect.any(Function),
    );
  });

  it('should process sensor data and create energy reading', () => {
    service.onModuleInit();

    const sensorData = {
      timestamp: Date.now(),
      solar: { power: 1000, voltage: 5.2, current: 192.3 },
      load: { power: 800, voltage: 4.8, current: 166.7 },
      export: { power: 200, active: true },
      import: { power: 0, active: false },
    };

    // Simulate message handling
    const mockCalls = (mockClient.on as jest.Mock).mock.calls as [
      string,
      (topic: string, message: Buffer) => void,
    ][];
    const messageCall = mockCalls.find((call) => call[0] === 'message');
    const handleMessage = messageCall?.[1];

    if (handleMessage) {
      handleMessage(
        'home/energy-monitor/sensors/METER001',
        Buffer.from(JSON.stringify(sensorData)),
      );
    }

    expect(mockEnergyReadingsService.create).toHaveBeenCalledWith({
      meterId: 'METER001',
      timestamp: expect.any(String) as string,
      voltage: expect.any(Number) as number,
      currentAmp: expect.any(Number) as number,
      powerKw: expect.any(Number) as number,
      flowDirection: expect.any(String) as string,
      smartmetersIds: expect.any(Array) as Array<any>,
    });
  });
});
