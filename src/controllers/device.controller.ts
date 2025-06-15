import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { MqttService } from '../services/mqtt.service';
import { DeviceCommandsService } from '../graphql/DeviceCommands/DeviceCommands.service';
import { SmartMetersService } from '../graphql/SmartMeters/SmartMeters.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { DeviceCommandPayload } from '../common/interfaces';

interface DeviceControlRequest {
  meterId: string;
  command: DeviceCommandPayload;
}

@Controller('device')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(
    private mqttService: MqttService,
    private deviceCommandsService: DeviceCommandsService,
    private smartMetersService: SmartMetersService,
  ) {}

  @Post('control')
  async sendDeviceCommand(@Body() body: DeviceControlRequest, @Request() req) {
    const { meterId, command } = body;
    const prosumerId = req.user.prosumerId;

    // Verify that the prosumer owns this device
    try {
      const meter = await this.smartMetersService.findOne(meterId);
      const prosumers = await this.smartMetersService.findProsumers(meterId);

      if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
        throw new BadRequestException(
          'Unauthorized: You do not own this device',
        );
      }
    } catch (error) {
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
    @Request() req,
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
    @Request() req,
  ) {
    const command: DeviceCommandPayload = {
      energy: {
        reset: body.type,
      },
    };

    return this.sendDeviceCommand({ meterId: body.meterId, command }, req);
  }

  @Post('configuration')
  async updateConfiguration(
    @Body() body: { meterId: string; sensorInterval?: number },
    @Request() req,
  ) {
    const command: DeviceCommandPayload = {
      mqtt: {
        sensor_interval: body.sensorInterval,
      },
    };

    return this.sendDeviceCommand({ meterId: body.meterId, command }, req);
  }

  @Get('commands/:meterId')
  async getDeviceCommands(@Param('meterId') meterId: string, @Request() req) {
    const prosumerId = req.user.prosumerId;

    // Verify ownership
    try {
      const meter = await this.smartMetersService.findOne(meterId);
      const prosumers = await this.smartMetersService.findProsumers(meterId);

      if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
        throw new BadRequestException('Unauthorized');
      }
    } catch (error) {
      throw new BadRequestException('Device not found or unauthorized');
    }

    const commands = await this.deviceCommandsService.findAll({ meterId });

    return {
      success: true,
      data: commands.sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
      ),
    };
  }

  @Get('status/:meterId')
  async getDeviceStatus(@Param('meterId') meterId: string, @Request() req) {
    const prosumerId = req.user.prosumerId;

    // Verify ownership
    try {
      const meter = await this.smartMetersService.findOne(meterId);
      const prosumers = await this.smartMetersService.findProsumers(meterId);

      if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
        throw new BadRequestException('Unauthorized');
      }
    } catch (error) {
      throw new BadRequestException('Device not found or unauthorized');
    }

    // Get latest status data
    const heartbeats =
      await this.smartMetersService.findDeviceheartbeatsList(meterId);
    const statusSnapshots =
      await this.smartMetersService.findDevicestatussnapshotsList(meterId);

    const latestHeartbeat = heartbeats.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0];

    const latestStatus = statusSnapshots.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )[0];

    return {
      success: true,
      data: {
        meterId,
        lastHeartbeat: latestHeartbeat,
        lastStatus: latestStatus,
        isOnline:
          latestHeartbeat &&
          new Date().getTime() - new Date(latestHeartbeat.timestamp).getTime() <
            5 * 60 * 1000, // 5 minutes
      },
    };
  }
}
