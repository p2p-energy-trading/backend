import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { MqttService } from '../services/mqtt.service';
import { DeviceHealthService } from '../services/device-health.service';
// Removed: DeviceCommandsService (table dropped)
import { SmartMetersService } from '../models/SmartMeters/SmartMeters.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { DeviceCommandPayload } from '../common/interfaces';
import { ProsumersService } from 'src/models/Prosumers/Prosumers.service';
import { RedisTelemetryService } from '../services/redis-telemetry.service';
import {
  DeviceControlDto,
  GridControlDto,
  EnergyResetDto,
  DeviceStatusDto,
  CommandResponseDto,
  DeviceStatusResponseDto,
} from '../common/dto/device.dto';

interface DeviceControlRequest {
  meterId: string;
  command: DeviceCommandPayload;
}

interface AuthenticatedUser {
  user: {
    prosumerId: string;
  };
}

@ApiTags('Device')
@ApiBearerAuth('JWT-auth')
@Controller('device')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  private readonly logger = new Logger(DeviceController.name);

  constructor(
    private mqttService: MqttService,
    private deviceHealthService: DeviceHealthService,
    // Removed: deviceCommandsService (DeviceCommands table dropped)
    private smartMetersService: SmartMetersService,
    private prosumersService: ProsumersService,
    private redisTelemetryService: RedisTelemetryService,
  ) {}

  @Post('control')
  @ApiOperation({
    summary: 'Send command to IoT device',
    description: 'Send MQTT command to smart meter for device control',
  })
  @ApiBody({ type: DeviceControlDto })
  @ApiResponse({
    status: 201,
    description: 'Command sent successfully',
    type: CommandResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Device not found or unauthorized',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - You do not own this device',
  })
  async sendDeviceCommand(
    @Body() body: DeviceControlRequest,
    @Request() req: AuthenticatedUser,
  ) {
    const { meterId, command } = body;
    const prosumerId: string = req.user.prosumerId;

    // Verify that the prosumer owns this device
    try {
      // const meter = await this.smartMetersService.findOne(meterId);
      const prosumers = await this.prosumersService.findByMeterId(meterId);

      if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
        throw new BadRequestException(
          'Unauthorized: You do not own this device',
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send command to device ${meterId} for prosumer ${prosumerId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Device not found or unauthorized');
    }

    const correlationId = await this.mqttService.sendCommand(
      meterId,
      command,
      prosumerId,
    );

    return {
      success: true,
      correlationId,
      message: 'Command sent to device',
    };
  }

  @Post('grid-control')
  @ApiOperation({
    summary: 'Control grid mode',
    description: 'Switch grid mode between import, export, or off',
  })
  @ApiBody({ type: GridControlDto })
  @ApiResponse({
    status: 201,
    description: 'Grid mode changed successfully',
    type: CommandResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request or unauthorized',
  })
  async controlGrid(
    @Body() body: { meterId: string; mode: 'import' | 'export' | 'off' },
    @Request() req: AuthenticatedUser,
  ) {
    const command: DeviceCommandPayload = {
      grid: body.mode,
    };

    return this.sendDeviceCommand({ meterId: body.meterId, command }, req);
  }

  @Post('energy-reset')
  @ApiOperation({
    summary: 'Reset energy counters',
    description: 'Reset energy measurement counters for specific subsystems',
  })
  @ApiBody({ type: EnergyResetDto })
  @ApiResponse({
    status: 201,
    description: 'Energy reset command sent successfully',
    type: CommandResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request or unauthorized',
  })
  async resetEnergy(
    @Body()
    body: { meterId: string; type: 'all' | 'battery' | 'solar' | 'load' },
    @Request() req: AuthenticatedUser,
  ) {
    const command: DeviceCommandPayload = {
      energy: {
        reset: body.type,
      },
    };

    return this.sendDeviceCommand({ meterId: body.meterId, command }, req);
  }

  @Get('status/:meterId')
  @ApiOperation({
    summary: 'Get device status',
    description:
      'Retrieve current operational status and telemetry data from Redis',
  })
  @ApiParam({
    name: 'meterId',
    description: 'Smart meter ID',
    example: 'SM001',
  })
  @ApiResponse({
    status: 200,
    description: 'Device status retrieved successfully',
    type: DeviceStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Device not found or unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'No status data available',
  })
  async getDeviceStatus(
    @Param('meterId') meterId: string,
    @Request() req: AuthenticatedUser,
  ) {
    const prosumerId: string = req.user.prosumerId;

    // Verify ownership
    try {
      const prosumers = await this.prosumersService.findByMeterId(meterId);

      if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
        throw new BadRequestException('Unauthorized');
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch status for device ${meterId} for prosumer ${prosumerId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Device not found or unauthorized');
    }

    // Get latest status and data from Redis
    const latestStatus =
      await this.redisTelemetryService.getLatestStatus(meterId);
    const latestData = await this.redisTelemetryService.getLatestData(meterId);

    // Determine device online status
    let isOnline = false;
    let latestTimestamp: Date | null = null;
    let timeSinceLastUpdate: number | null = null;

    // Check both status and data timestamps
    const statusTimestamp = latestStatus?.datetime
      ? new Date(latestStatus.datetime)
      : null;
    const dataTimestamp = latestData?.datetime
      ? new Date(latestData.datetime)
      : null;

    // Use the most recent timestamp
    if (statusTimestamp && dataTimestamp) {
      latestTimestamp =
        statusTimestamp > dataTimestamp ? statusTimestamp : dataTimestamp;
    } else if (statusTimestamp) {
      latestTimestamp = statusTimestamp;
    } else if (dataTimestamp) {
      latestTimestamp = dataTimestamp;
    }

    // Device is online if last update was within 30 seconds
    if (latestTimestamp) {
      timeSinceLastUpdate = Date.now() - latestTimestamp.getTime();
      isOnline = timeSinceLastUpdate < 30 * 1000; // 30 second threshold
    }

    // this.logger.debug(
    //   `Device ${meterId} - Latest timestamp: ${latestTimestamp?.toISOString()}, ` +
    //     `Time since last update: ${timeSinceLastUpdate ? timeSinceLastUpdate + 'ms' : 'N/A'}, ` +
    //     `Online: ${isOnline}`,
    // );

    return {
      success: true,
      data: {
        meterId,
        lastHeartbeat: latestTimestamp
          ? {
              timestamp: latestTimestamp.toISOString(),
              status: isOnline ? 'alive' : 'offline',
              timeSinceLastUpdate: timeSinceLastUpdate
                ? `${Math.floor(timeSinceLastUpdate / 1000)}s`
                : null,
              source: 'redis_telemetry',
            }
          : null,
        lastStatus: latestStatus
          ? {
              wifi: latestStatus.data.wifi,
              grid: latestStatus.data.grid,
              mqtt: latestStatus.data.mqtt,
              system: latestStatus.data.system,
              timestamp: latestStatus.datetime,
            }
          : null,
        lastData: latestData
          ? {
              battery: latestData.data.battery,
              export: latestData.data.export,
              import: latestData.data.import,
              solar: latestData.data.solar_input,
              load: latestData.data.load_home,
              timestamp: latestData.datetime,
            }
          : null,
        isOnline,
        heartbeatThreshold: '30 seconds',
      },
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Get overall device health status',
    description:
      'Monitor overall smart meter health, uptime, and connectivity status across all devices',
  })
  @ApiResponse({
    status: 200,
    description: 'Device health status retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalDevices: { type: 'number', example: 3 },
            onlineDevices: { type: 'number', example: 2 },
            offlineDevices: { type: 'number', example: 1 },
            healthPercentage: { type: 'number', example: 67 },
            lastHeartbeat: {
              type: 'string',
              example: '2025-10-26T12:00:00.000Z',
            },
            averageUptime: { type: 'number', example: 95.5 },
            authorizedDevices: { type: 'number', example: 3 },
            settlementsToday: { type: 'number', example: 12 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to retrieve device health',
  })
  async getDeviceHealth(@Request() req: AuthenticatedUser) {
    try {
      const prosumerId = req.user.prosumerId;
      const health = await this.deviceHealthService.getDeviceHealth(prosumerId);

      return {
        success: true,
        data: health,
      };
    } catch (error) {
      this.logger.error('Error getting device health:', error);
      throw new BadRequestException('Failed to retrieve device health status');
    }
  }

  @Get('health/:meterId')
  @ApiOperation({
    summary: 'Get specific meter health details',
    description:
      'Retrieve detailed health information for a specific smart meter including connectivity, system metrics, and energy data',
  })
  @ApiParam({
    name: 'meterId',
    description: 'Smart meter ID',
    example: 'SM001',
  })
  @ApiResponse({
    status: 200,
    description: 'Meter health details retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            meterId: { type: 'string', example: 'SM001' },
            isOnline: { type: 'boolean', example: true },
            lastSeen: { type: 'string', example: '2025-10-26T12:00:00.000Z' },
            lastSeenMinutes: { type: 'number', example: 2 },
            connectivity: {
              type: 'object',
              properties: {
                wifi: {
                  type: 'object',
                  properties: {
                    connected: { type: 'boolean', example: true },
                    rssi: { type: 'number', example: -65 },
                    ip: { type: 'string', example: '192.168.1.100' },
                  },
                },
                mqtt: {
                  type: 'object',
                  properties: {
                    connected: { type: 'boolean', example: true },
                    attempts: { type: 'number', example: 0 },
                    qos: { type: 'number', example: 2 },
                  },
                },
              },
            },
            system: {
              type: 'object',
              properties: {
                uptime: { type: 'number', example: 3600000 },
                uptimeHours: { type: 'number', example: 1 },
                freeHeap: { type: 'number', example: 225000 },
                status: { type: 'string', example: 'alive' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Meter not found or unauthorized',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Meter not found',
  })
  async getMeterHealth(
    @Param('meterId') meterId: string,
    @Request() req: AuthenticatedUser,
  ) {
    try {
      const prosumerId = req.user.prosumerId;

      // Verify meter belongs to prosumer
      const prosumers = await this.prosumersService.findByMeterId(meterId);
      if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
        throw new BadRequestException('Unauthorized access to this meter');
      }

      const health =
        await this.deviceHealthService.getDeviceHealthDetails(meterId);

      if (!health) {
        throw new BadRequestException('Meter not found or no data available');
      }

      return {
        success: true,
        data: health,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error getting meter health for ${meterId}:`, error);
      throw new BadRequestException('Failed to retrieve meter health details');
    }
  }

  @Get('list')
  @ApiOperation({
    summary: 'List all devices with status',
    description:
      'Get a list of all smart meters owned by the prosumer with their current status and connectivity',
  })
  @ApiResponse({
    status: 200,
    description: 'Device list retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              meterId: { type: 'string', example: 'SM001' },
              name: { type: 'string', example: 'Main Building Meter' },
              location: { type: 'string', example: 'Building A' },
              status: { type: 'string', example: 'online' },
              lastSeen: {
                type: 'string',
                example: '2025-10-26T12:00:00.000Z',
              },
              connectivity: {
                type: 'object',
                properties: {
                  wifi: { type: 'boolean', example: true },
                  mqtt: { type: 'boolean', example: true },
                  rssi: { type: 'number', example: -65 },
                },
              },
              system: {
                type: 'object',
                properties: {
                  uptime: { type: 'number', example: 3600000 },
                  freeHeap: { type: 'number', example: 225000 },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async listDevices(@Request() req: AuthenticatedUser) {
    try {
      const prosumerId = req.user.prosumerId;
      const devices = await this.deviceHealthService.getDeviceList(prosumerId);

      return {
        success: true,
        data: devices,
      };
    } catch (error) {
      this.logger.error('Error listing devices:', error);
      throw new BadRequestException('Failed to retrieve device list');
    }
  }

  @Get('connectivity/:meterId')
  @ApiOperation({
    summary: 'Check device connectivity status',
    description:
      'Check detailed connectivity status including WiFi, MQTT, and last seen information',
  })
  @ApiParam({
    name: 'meterId',
    description: 'Smart meter ID',
    example: 'SM001',
  })
  @ApiResponse({
    status: 200,
    description: 'Connectivity status retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            meterId: { type: 'string', example: 'SM001' },
            connected: { type: 'boolean', example: true },
            lastSeen: { type: 'string', example: '2025-10-26T12:00:00.000Z' },
            reason: { type: 'string', example: 'Connected' },
            details: {
              type: 'object',
              properties: {
                wifi: {
                  type: 'object',
                  properties: {
                    connected: { type: 'boolean', example: true },
                    rssi: { type: 'number', example: -65 },
                    ip: { type: 'string', example: '192.168.1.100' },
                  },
                },
                mqtt: {
                  type: 'object',
                  properties: {
                    connected: { type: 'boolean', example: true },
                    qos: { type: 'number', example: 2 },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Meter not found or unauthorized',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async checkConnectivity(
    @Param('meterId') meterId: string,
    @Request() req: AuthenticatedUser,
  ) {
    try {
      const prosumerId = req.user.prosumerId;

      // Verify meter belongs to prosumer
      const prosumers = await this.prosumersService.findByMeterId(meterId);
      if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
        throw new BadRequestException('Unauthorized access to this meter');
      }

      const connectivity =
        await this.deviceHealthService.checkDeviceConnectivity(meterId);

      return {
        success: true,
        data: connectivity,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error checking connectivity for ${meterId}:`, error);
      throw new BadRequestException('Failed to check device connectivity');
    }
  }
}
