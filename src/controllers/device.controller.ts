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
// Removed: DeviceCommandsService (table dropped)
import { SmartMetersService } from '../models/SmartMeters/SmartMeters.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { DeviceCommandPayload } from '../common/interfaces';
import { ProsumersService } from 'src/models/Prosumers/Prosumers.service';
// TODO: Replace with Redis telemetry
// import { DeviceStatusSnapshotsService } from 'src/models/DeviceStatusSnapshots/DeviceStatusSnapshots.service';
// import { EnergyReadingsDetailedService } from 'src/models/EnergyReadingsDetailed/EnergyReadingsDetailed.service';
import {
  DeviceControlDto,
  GridControlDto,
  EnergyResetDto,
  DeviceStatusDto,
  CommandResponseDto,
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
    // Removed: deviceCommandsService (DeviceCommands table dropped)
    private smartMetersService: SmartMetersService,
    private prosumersService: ProsumersService,
    // TODO: Replace with Redis telemetry
    // private deviceStatusSnapshotsService: DeviceStatusSnapshotsService,
    // private energyReadingsDetailedService: EnergyReadingsDetailedService,
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
    description: 'Retrieve current operational status of smart meter',
  })
  @ApiParam({
    name: 'meterId',
    description: 'Smart meter ID',
    example: 'SM001',
  })
  @ApiResponse({
    status: 200,
    description: 'Device status retrieved successfully',
    type: DeviceStatusDto,
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
      // const meter = await this.smartMetersService.findOne(meterId);
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

    // TODO: Get latest status data from Redis instead
    // const statusSnapshots = await this.deviceStatusSnapshotsService.findAll({ meterId });
    // For now, return mock data
    const latestStatus = null;

    // TODO: Get the latest sensor data timestamp from Redis for heartbeat detection
    // const latestSensorTimestamp = await this.energyReadingsDetailedService.findLatestSensorTimestamp(meterId);
    const latestSensorTimestamp: Date | null = null;

    // Determine if device is online based on latest sensor data (10-second threshold)
    const isOnline = false; // TODO: Implement with Redis
    // latestSensorTimestamp && new Date().getTime() - latestSensorTimestamp.getTime() < 10 * 1000;

    // this.logger.debug(
    //   `Device ${meterId} - Latest sensor timestamp: ${latestSensorTimestamp?.toISOString()}, ` +
    //     `Time since last sensor: ${latestSensorTimestamp ? new Date().getTime() - latestSensorTimestamp.getTime() : 'N/A'}ms, ` +
    //     `Online: ${!!isOnline}`,
    // );

    return {
      success: true,
      data: {
        meterId,
        lastHeartbeat: null, // TODO: Implement with Redis telemetry
        // latestSensorTimestamp
        //   ? {
        //       timestamp: latestSensorTimestamp.toISOString(),
        //       status: isOnline ? 'alive' : 'offline',
        //       source: 'mqtt_sensor',
        //     }
        //   : null,
        lastStatus: latestStatus,
        isOnline: !!isOnline,
        heartbeatThreshold: '10 seconds', // Document the threshold used
      },
    };
  }
}
