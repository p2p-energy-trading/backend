import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
  Param,
  Delete,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SmartMetersService } from '../models/SmartMeters/SmartMeters.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { MqttService } from '../services/mqtt.service';
import { SmartMeterHealthService } from '../services/smart-meter-health.service';
import { ProsumersService } from 'src/models/Prosumers/Prosumers.service';
import { RedisTelemetryService } from '../services/redis-telemetry.service';
import { TelemetryAggregationService } from '../services/telemetry-aggregation.service';
import { TelemetryArchivalService } from '../services/telemetry-archival.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { TelemetryAggregate } from '../models/TelemetryAggregate/TelemetryAggregate.entity';
import { DeviceCommandPayload } from '../common/interfaces';
import {
  CreateSmartMeterDto,
  SmartMeterResponseDto,
  LinkSmartMeterDto,
  UnlinkSmartMeterDto,
  UpdateSettlementIntervalDto,
} from '../common/dto/smart-meter.dto';
import {
  DeviceControlDto,
  GridControlDto,
  EnergyResetDto,
  DeviceStatusDto,
  CommandResponseDto,
  DeviceStatusResponseDto,
} from '../common/dto/device.dto';

interface User extends Request {
  user: {
    prosumerId: string;
  };
}

interface CreateSmartMeterRequest {
  meterId: string;
  location?: string;
  meterBlockchainAddress?: string;
  deviceModel?: string;
  deviceVersion?: string;
  capabilities?: any;
}

interface DeviceControlRequest {
  meterId: string;
  command: DeviceCommandPayload;
}

/**
 * Smart Meter Controller
 * Consolidated controller for all smart meter operations including:
 * - Meter management (create, list, get, delete)
 * - Device control (MQTT commands, grid control, energy reset)
 * - Device health and status monitoring
 * - Telemetry data access (latest, historical, aggregated)
 */
@ApiTags('Smart Meters')
@ApiBearerAuth('JWT-auth')
@Controller('smart-meters')
@UseGuards(JwtAuthGuard)
export class SmartMeterController {
  private readonly logger = new Logger(SmartMeterController.name);

  constructor(
    private smartMetersService: SmartMetersService,
    private mqttService: MqttService,
    private smartMeterHealthService: SmartMeterHealthService,
    private prosumersService: ProsumersService,
    private redisTelemetryService: RedisTelemetryService,
    private telemetryAggregationService: TelemetryAggregationService,
    private telemetryArchivalService: TelemetryArchivalService,
    @InjectRepository(TelemetryAggregate)
    private telemetryAggregateRepository: Repository<TelemetryAggregate>,
  ) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create and register a smart meter',
    description: 'Create a new smart meter and link it to the prosumer account',
  })
  @ApiBody({ type: CreateSmartMeterDto })
  @ApiResponse({
    status: 201,
    description: 'Smart meter created successfully',
    type: SmartMeterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Meter ID missing or meter already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Meter already exists',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to create meter',
  })
  async createSmartMeter(
    @Body() body: CreateSmartMeterRequest,
    @Request() req: User,
  ) {
    try {
      const prosumerId = req.user.prosumerId;

      // Validate required fields
      if (!body.meterId) {
        throw new BadRequestException('Meter ID is required');
      }

      // Check if meter already exists
      try {
        const existingMeter = await this.smartMetersService.findOne(
          body.meterId,
        );
        if (existingMeter) {
          throw new BadRequestException(
            `Smart meter with ID ${body.meterId} already exists`,
          );
        }
      } catch (error) {
        // If meter not found, it's okay to continue
        if (error instanceof Error && !error.message.includes('not found')) {
          throw error;
        }
      }

      // Create smart meter data
      const smartMeterData = {
        meterId: body.meterId,
        prosumerId: prosumerId,
        location: body.location || 'Location not specified',
        status: 'ACTIVE',
        meterBlockchainAddress: body.meterBlockchainAddress || undefined,
        deviceModel: body.deviceModel || 'Generic Smart Meter',
        deviceVersion: body.deviceVersion || '1.0.0',
        capabilities: body.capabilities
          ? JSON.stringify(body.capabilities)
          : '{}',
        mqttTopicRealtime: `enerlink/meters/${body.meterId}/realtime`,
        mqttTopicSettlement: `enerlink/meters/${body.meterId}/settlement`,
        settlementIntervalMinutes: 5,
        firmwareVersion: '1.0.0',
        deviceConfiguration: '{}',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      };

      // Create the smart meter
      const newSmartMeter =
        await this.smartMetersService.create(smartMeterData);

      this.logger.log(
        `Smart meter ${body.meterId} created and linked to prosumer ${prosumerId}`,
      );

      return {
        success: true,
        message: 'Smart meter created and linked successfully',
        data: {
          meterId: newSmartMeter.meterId,
          prosumerId: newSmartMeter.prosumerId,
          location: newSmartMeter.location,
          status: newSmartMeter.status,
          deviceModel: newSmartMeter.deviceModel,
          deviceVersion: newSmartMeter.deviceVersion,
          mqttTopicRealtime: newSmartMeter.mqttTopicRealtime,
          mqttTopicSettlement: newSmartMeter.mqttTopicSettlement,
          createdAt: newSmartMeter.createdAt,
        },
      };
    } catch (error) {
      this.logger.error('Error creating smart meter:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to create smart meter: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @Get('list')
  @ApiOperation({
    summary: 'Get my smart meters',
    description:
      'Retrieve all smart meters owned by the authenticated prosumer',
  })
  @ApiResponse({
    status: 200,
    description: 'Smart meters retrieved successfully',
    type: [SmartMeterResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - No meters found for user',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to retrieve meters',
  })
  async getMySmartMeters(@Request() req: User) {
    try {
      const prosumerId = req.user.prosumerId;

      // Get all smart meters for this prosumer
      const smartMeters =
        await this.smartMetersService.findByProsumerId(prosumerId);

      return {
        success: true,
        message: 'Smart meters retrieved successfully',
        data: smartMeters.map((meter) => ({
          meterId: meter.meterId,
          location: meter.location,
          status: meter.status,
          deviceModel: meter.deviceModel,
          deviceVersion: meter.deviceVersion,
          lastSeen: meter.lastSeen,
          createdAt: meter.createdAt,
          mqttTopicRealtime: meter.mqttTopicRealtime,
          mqttTopicSettlement: meter.mqttTopicSettlement,
        })),
        count: smartMeters.length,
      };
    } catch (error) {
      this.logger.error('Error retrieving smart meters:', error);
      throw new BadRequestException(
        `Failed to retrieve smart meters: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @Get(':meterId')
  @ApiOperation({
    summary: 'Get smart meter details',
    description: 'Retrieve detailed information for a specific smart meter',
  })
  @ApiParam({
    name: 'meterId',
    description: 'Smart meter ID',
    example: 'SM001',
  })
  @ApiResponse({
    status: 200,
    description: 'Smart meter details retrieved successfully',
    type: SmartMeterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unauthorized or meter not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Meter does not exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to retrieve meter',
  })
  async getSmartMeter(@Param('meterId') meterId: string, @Request() req: User) {
    try {
      const prosumerId = req.user.prosumerId;

      // Get the smart meter
      const smartMeter = await this.smartMetersService.findOne(meterId);

      // Verify ownership
      if (smartMeter.prosumerId !== prosumerId) {
        throw new BadRequestException(
          'Unauthorized: You do not own this smart meter',
        );
      }

      return {
        success: true,
        message: 'Smart meter retrieved successfully',
        data: {
          meterId: smartMeter.meterId,
          prosumerId: smartMeter.prosumerId,
          location: smartMeter.location,
          status: smartMeter.status,
          deviceModel: smartMeter.deviceModel,
          deviceVersion: smartMeter.deviceVersion,
          firmwareVersion: smartMeter.firmwareVersion,
          lastSeen: smartMeter.lastSeen,
          lastHeartbeatAt: smartMeter.lastHeartbeatAt,
          createdAt: smartMeter.createdAt,
          updatedAt: smartMeter.updatedAt,
          mqttTopicRealtime: smartMeter.mqttTopicRealtime,
          mqttTopicSettlement: smartMeter.mqttTopicSettlement,
          settlementIntervalMinutes: smartMeter.settlementIntervalMinutes,
        },
      };
    } catch (error) {
      this.logger.error(`Error retrieving smart meter ${meterId}:`, error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to retrieve smart meter: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // ============================================================================
  // DEVICE CONTROL ENDPOINTS (from DeviceController)
  // ============================================================================

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
    @Request() req: User,
  ) {
    const { meterId, command } = body;
    const prosumerId: string = req.user.prosumerId;

    // Verify that the prosumer owns this device
    try {
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
    @Request() req: User,
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
    @Request() req: User,
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
    @Request() req: User,
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

  // ============================================================================
  // DEVICE HEALTH ENDPOINTS (from DeviceController)
  // ============================================================================

  @Get('health')
  @ApiOperation({
    summary: 'Get overall device health status',
    description:
      'Monitor overall smart meter health, uptime, and connectivity status across all devices',
  })
  @ApiResponse({
    status: 200,
    description: 'Device health status retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to retrieve device health',
  })
  async getDeviceHealth(@Request() req: User) {
    try {
      const prosumerId = req.user.prosumerId;
      const health =
        await this.smartMeterHealthService.getDeviceHealth(prosumerId);

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
    @Request() req: User,
  ) {
    try {
      const prosumerId = req.user.prosumerId;

      // Verify meter belongs to prosumer
      const prosumers = await this.prosumersService.findByMeterId(meterId);
      if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
        throw new BadRequestException('Unauthorized access to this meter');
      }

      const health =
        await this.smartMeterHealthService.getDeviceHealthDetails(meterId);

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

  @Get('devices/list')
  @ApiOperation({
    summary: 'List all devices with status',
    description:
      'Get a list of all smart meters owned by the prosumer with their current status and connectivity',
  })
  @ApiResponse({
    status: 200,
    description: 'Device list retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async listDevices(@Request() req: User) {
    try {
      const prosumerId = req.user.prosumerId;
      const devices =
        await this.smartMeterHealthService.getDeviceList(prosumerId);

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
    @Request() req: User,
  ) {
    try {
      const prosumerId = req.user.prosumerId;

      // Verify meter belongs to prosumer
      const prosumers = await this.prosumersService.findByMeterId(meterId);
      if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
        throw new BadRequestException('Unauthorized access to this meter');
      }

      const connectivity =
        await this.smartMeterHealthService.checkDeviceConnectivity(meterId);

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

  // ============================================================================
  // TELEMETRY ENDPOINTS (from TelemetryController)
  // ============================================================================

  @Get('telemetry/latest/data/:meterId')
  @ApiOperation({
    summary: 'Get latest meter data from Redis (device info, connectivity)',
  })
  @ApiResponse({
    status: 200,
    description: 'Latest meter data retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Meter data not found' })
  async getLatestData(@Param('meterId') meterId: string) {
    const data = await this.redisTelemetryService.getLatestData(meterId);

    if (!data) {
      throw new HttpException('Meter data not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      data,
    };
  }

  @Get('telemetry/latest/status/:meterId')
  @ApiOperation({
    summary: 'Get latest meter status from Redis (energy measurements)',
  })
  @ApiResponse({
    status: 200,
    description: 'Latest meter status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Meter status not found' })
  async getLatestStatus(@Param('meterId') meterId: string) {
    const status = await this.redisTelemetryService.getLatestStatus(meterId);

    if (!status) {
      throw new HttpException('Meter status not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      data: status,
    };
  }

  @Get('telemetry/latest/all')
  @ApiOperation({
    summary: 'Get latest data and status for all meters from Redis',
  })
  @ApiResponse({
    status: 200,
    description: 'All latest data retrieved successfully',
  })
  async getAllLatest() {
    const [dataMap, statusMap] = await Promise.all([
      this.redisTelemetryService.getAllLatestData(),
      this.redisTelemetryService.getAllLatestStatus(),
    ]);

    // Combine data and status by meterId
    const combined: Record<string, any> = {};

    for (const meterId of new Set([
      ...Object.keys(dataMap),
      ...Object.keys(statusMap),
    ])) {
      combined[meterId] = {
        meterId,
        data: dataMap[meterId] || null,
        status: statusMap[meterId] || null,
      };
    }

    return {
      success: true,
      data: Object.values(combined),
    };
  }

  @Get('telemetry/history/:meterId')
  @ApiOperation({
    summary: 'Get historical hourly aggregated data from PostgreSQL',
  })
  @ApiQuery({
    name: 'start',
    required: false,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'end',
    required: false,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit number of records (default: 168 = 1 week)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historical data retrieved successfully',
  })
  async getHistory(
    @Param('meterId') meterId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 168; // Default 1 week (24h * 7d)

    const whereClause: any = { meterId };

    if (start && end) {
      whereClause.hourStart = Between(new Date(start), new Date(end));
    } else if (start) {
      whereClause.hourStart = MoreThanOrEqual(new Date(start));
    } else if (end) {
      whereClause.hourStart = LessThanOrEqual(new Date(end));
    }

    const history = await this.telemetryAggregateRepository.find({
      where: whereClause,
      order: { hourStart: 'DESC' },
      take: limitNum,
    });

    return {
      success: true,
      data: history.reverse(), // Return in chronological order
      count: history.length,
    };
  }

  @Get('telemetry/history/all')
  @ApiOperation({ summary: 'Get historical data for all meters' })
  @ApiQuery({
    name: 'start',
    required: false,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'end',
    required: false,
    description: 'End date (ISO 8601)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit per meter (default: 24 = last day)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historical data for all meters retrieved successfully',
  })
  async getAllHistory(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 24; // Default last 24 hours

    const whereClause: any = {};

    if (start && end) {
      whereClause.hourStart = Between(new Date(start), new Date(end));
    } else if (start) {
      whereClause.hourStart = MoreThanOrEqual(new Date(start));
    } else if (end) {
      whereClause.hourStart = LessThanOrEqual(new Date(end));
    }

    // Get unique meter IDs
    const meters = await this.telemetryAggregateRepository
      .createQueryBuilder('t')
      .select('DISTINCT t.meterId', 'meterId')
      .getRawMany();

    // Get history for each meter
    const allHistory = await Promise.all(
      meters.map(async ({ meterId }) => {
        const history = await this.telemetryAggregateRepository.find({
          where: { ...whereClause, meterId },
          order: { hourStart: 'DESC' },
          take: limitNum,
        });

        return {
          meterId,
          data: history.reverse(),
        };
      }),
    );

    return {
      success: true,
      data: allHistory,
    };
  }

  @Get('telemetry/stats/archive')
  @ApiOperation({ summary: 'Get archival statistics' })
  @ApiResponse({
    status: 200,
    description: 'Archive stats retrieved successfully',
  })
  async getArchiveStats() {
    const stats = await this.telemetryArchivalService.getArchiveStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('telemetry/health')
  @ApiOperation({ summary: 'Check telemetry system health' })
  @ApiResponse({ status: 200, description: 'System health check' })
  async telemetryHealthCheck() {
    const redisHealthy = await this.redisTelemetryService.ping();

    return {
      success: true,
      data: {
        redis: redisHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ============================================================================
  // METER DELETION ENDPOINT
  // ============================================================================

  @Delete(':meterId')
  @ApiOperation({
    summary: 'Remove smart meter',
    description: 'Delete a smart meter from the system',
  })
  @ApiParam({
    name: 'meterId',
    description: 'Smart meter ID to remove',
    example: 'SM001',
  })
  @ApiResponse({
    status: 200,
    description: 'Smart meter removed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Unauthorized or failed to remove meter',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Meter does not exist',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to remove meter',
  })
  async removeSmartMeter(
    @Param('meterId') meterId: string,
    @Request() req: User,
  ) {
    try {
      const prosumerId = req.user.prosumerId;

      // Get the smart meter first to verify ownership
      const smartMeter = await this.smartMetersService.findOne(meterId);

      // Verify ownership
      if (smartMeter.prosumerId !== prosumerId) {
        throw new BadRequestException(
          'Unauthorized: You do not own this smart meter',
        );
      }

      // Remove the smart meter
      const removed = await this.smartMetersService.remove(meterId);

      if (!removed) {
        throw new BadRequestException('Failed to remove smart meter');
      }

      this.logger.log(
        `Smart meter ${meterId} removed by prosumer ${prosumerId}`,
      );

      return {
        success: true,
        message: 'Smart meter removed successfully',
        data: {
          meterId,
          removedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error removing smart meter ${meterId}:`, error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to remove smart meter: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
