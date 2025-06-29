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
import { MqttService } from '../services/mqtt.service';
import { DeviceCommandsService } from '../modules/DeviceCommands/DeviceCommands.service';
import { SmartMetersService } from '../modules/SmartMeters/SmartMeters.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { DeviceCommandPayload } from '../common/interfaces';
import { ProsumersService } from 'src/modules/Prosumers/Prosumers.service';
import { DeviceStatusSnapshotsService } from 'src/modules/DeviceStatusSnapshots/DeviceStatusSnapshots.service';

interface DeviceControlRequest {
  meterId: string;
  command: DeviceCommandPayload;
}

interface AuthenticatedUser {
  user: {
    prosumerId: string;
  };
}

@Controller('device')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  private readonly logger = new Logger(DeviceController.name);

  constructor(
    private mqttService: MqttService,
    private deviceCommandsService: DeviceCommandsService,
    private smartMetersService: SmartMetersService,
    private prosumersService: ProsumersService,
    private deviceStatusSnapshotsService: DeviceStatusSnapshotsService,
  ) {}

  @Post('control')
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

    // Get device info and latest status data
    const meter = await this.smartMetersService.findOne(meterId);
    const statusSnapshots = await this.deviceStatusSnapshotsService.findAll({
      meterId,
    });

    const latestStatus = statusSnapshots.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0];

    // Use lastHeartbeatAt from SmartMeters entity instead of separate heartbeats
    const lastHeartbeatTime = meter.lastHeartbeatAt;
    const isOnline =
      lastHeartbeatTime &&
      new Date().getTime() - new Date(lastHeartbeatTime).getTime() <
        5 * 60 * 1000; // 5 minutes

    return {
      success: true,
      data: {
        meterId,
        lastHeartbeat:
          lastHeartbeatTime != null
            ? {
                timestamp:
                  lastHeartbeatTime instanceof Date
                    ? lastHeartbeatTime.toISOString()
                    : lastHeartbeatTime,
                status: isOnline ? 'alive' : 'offline',
              }
            : null,
        lastStatus: latestStatus,
        isOnline: !!isOnline,
      },
    };
  }
}
