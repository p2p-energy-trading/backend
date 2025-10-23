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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { SmartMetersService } from '../models/SmartMeters/SmartMeters.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import {
  CreateSmartMeterDto,
  SmartMeterResponseDto,
  LinkSmartMeterDto,
  UnlinkSmartMeterDto,
  UpdateSettlementIntervalDto,
} from '../common/dto/smart-meter.dto';

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

@ApiTags('Smart Meters')
@ApiBearerAuth('JWT-auth')
@Controller('smart-meters')
@UseGuards(JwtAuthGuard)
export class SmartMeterController {
  private readonly logger = new Logger(SmartMeterController.name);

  constructor(private smartMetersService: SmartMetersService) {}

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
