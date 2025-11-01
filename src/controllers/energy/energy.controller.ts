import {
  Controller,
  // Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { EnergySettlementService } from '../../services/energy/energy-settlement.service';
import { EnergySettlementsService } from '../../models/energySettlement/energySettlement.service';
import { EnergyAnalyticsService } from '../../services/energy/energy-analytics.service';
import { TelemetryAggregationService } from '../../services/telemetry/telemetry-aggregation.service';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { AuthService } from '../../auth/auth.service';
import { AuthenticatedUser } from '../../common/interfaces';
import { ResponseFormatter } from '../../common/response-formatter';
import {
  SettlementEstimateDto,
  SettlementRecordDto,
} from '../../common/dto/energy.dto';
// import { SettlementTrigger } from '../common/enums';

@ApiTags('Energy')
@ApiBearerAuth('JWT-auth')
@Controller('energy')
@UseGuards(JwtAuthGuard)
export class EnergyController {
  private readonly logger = new Logger(EnergyController.name);

  constructor(
    private energySettlementService: EnergySettlementService,
    private energySettlementsService: EnergySettlementsService,
    private energyAnalyticsService: EnergyAnalyticsService,
    private telemetryAggregationService: TelemetryAggregationService,
    private authService: AuthService,
  ) {}

  @Get('settlement/history')
  @ApiOperation({
    summary: 'Get settlement history',
    description:
      'Retrieve historical energy settlement records with filtering options',
  })
  @ApiQuery({
    name: 'meterId',
    required: false,
    description: 'Filter by specific smart meter ID',
    example: 'SM001',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of records to return',
    example: '50',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['own', 'public', 'all'],
    description:
      'Data scope: own (your data), public (anonymized), all (admin)',
    example: 'own',
  })
  @ApiResponse({
    status: 200,
    description: 'Settlement history retrieved successfully',
    type: [SettlementRecordDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid scope parameter',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - No settlements found',
  })
  async getSettlementHistory(
    @Request() req: AuthenticatedUser,
    @Query('meterId') meterId?: string,
    @Query('limit') limit?: string,
    @Query('scope') scope?: 'own' | 'public' | 'all',
  ) {
    try {
      const prosumerId = req.user.prosumerId;
      const validScope = scope || 'own'; // Default to 'own' if not specified

      // Validate scope parameter
      if (!['own', 'public', 'all'].includes(validScope)) {
        throw new BadRequestException(
          'Invalid scope parameter. Must be one of: own, public, all',
        );
      }

      // Only allow 'public' and 'own' scopes for regular users
      // Admin users can access 'all' scope (you can add role-based auth here)
      if (validScope === 'all') {
        // TODO: Add admin role check here
        // For now, we'll allow it but log it
        this.logger.warn(
          `User ${prosumerId} requested 'all' scope for settlement history`,
        );
      }

      const settlements: any[] =
        await this.energySettlementService.getSettlementHistory(
          meterId,
          prosumerId,
          limit ? parseInt(limit) : 50,
          validScope,
        );

      return ResponseFormatter.successWithMetadata(
        settlements,
        {
          scope: validScope,
          meterId: meterId || 'all',
          count: settlements.length,
          limit: limit ? parseInt(limit) : 50,
        },
        'Settlement history retrieved successfully',
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error getting settlement history:', error);
      return ResponseFormatter.error(
        'Failed to retrieve settlement history',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('settlement/:settlementId')
  @ApiOperation({
    summary: 'Get settlement details',
    description: 'Retrieve detailed information for a specific settlement',
  })
  @ApiParam({
    name: 'settlementId',
    description: 'Settlement ID',
    example: '123',
  })
  @ApiResponse({
    status: 200,
    description: 'Settlement details retrieved successfully',
    type: SettlementRecordDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid settlement ID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Settlement does not belong to user',
  })
  @ApiResponse({
    status: 404,
    description: 'Settlement not found',
  })
  async getSettlement(
    @Param('settlementId') settlementId: string,
    @Request() req: AuthenticatedUser,
  ) {
    try {
      const settlementIdNum = parseInt(settlementId);
      if (isNaN(settlementIdNum)) {
        throw new BadRequestException('Invalid settlement ID format');
      }

      const settlement =
        await this.energySettlementsService.findOne(settlementIdNum);

      if (!settlement) {
        throw new NotFoundException('Settlement not found');
      }

      // Verify the settlement belongs to the user's meter
      // This requires checking if the meter belongs to the prosumer
      const prosumerId = req.user.prosumerId;

      // Get settlement history to verify ownership (reusing existing logic)
      const userSettlements: any[] =
        await this.energySettlementService.getSettlementHistory(
          settlement.meterId,
          prosumerId,
          1000, // Large limit to check if this settlement is in user's settlements
          'own', // Use 'own' scope to get only user's settlements
        );

      const userOwnsSettlement = userSettlements.some((s: any) => {
        const settlementId = (s as { settlementId?: string | number })
          ?.settlementId;
        return settlementId != null && Number(settlementId) === settlementIdNum;
      });

      if (!userOwnsSettlement) {
        throw new NotFoundException('Settlement not found');
      }

      return ResponseFormatter.success(
        settlement,
        'Settlement details retrieved successfully',
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Error getting settlement:', error);
      return ResponseFormatter.error(
        'Failed to retrieve settlement',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('settlement-estimator')
  @ApiOperation({
    summary: 'Get settlement estimate',
    description: 'Estimate ETK tokens to be minted/burned in next settlement',
  })
  @ApiQuery({
    name: 'meterId',
    required: false,
    description: 'Smart meter ID (uses first meter if not provided)',
    example: 'SM001',
  })
  @ApiResponse({
    status: 200,
    description: 'Settlement estimate retrieved successfully',
    type: SettlementEstimateDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid meter ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Meter does not belong to user',
  })
  @ApiResponse({
    status: 404,
    description: 'No meters found or no energy data available',
  })
  async getSettlementEstimator(
    @Request() req: AuthenticatedUser,
    @Query('meterId') meterId?: string,
  ) {
    try {
      const prosumerId = req.user.prosumerId;

      // If no meterId provided, get the first meter from user profile
      let targetMeterId = meterId;
      if (!targetMeterId) {
        // Get user profile to retrieve meters
        const profile = await this.authService.getProfile(prosumerId);

        if (!profile.meters || profile.meters.length === 0) {
          throw new NotFoundException('No meters found for this prosumer');
        }

        // Use the first meter from profile
        targetMeterId = profile.meters[0].meterId;
      }

      // Verify the meter belongs to the prosumer by checking profile
      const profile = await this.authService.getProfile(prosumerId);
      const userMeter = profile.meters?.find(
        (m) => m.meterId === targetMeterId,
      );

      if (!userMeter) {
        throw new NotFoundException('Meter not found or unauthorized access');
      }

      // Get settlement estimator data
      const estimatorData =
        await this.energySettlementService.getSettlementEstimator(
          targetMeterId,
        );

      if (!estimatorData) {
        throw new NotFoundException(
          'Unable to retrieve settlement estimator data',
        );
      }

      return ResponseFormatter.success(
        {
          meterId: targetMeterId,
          ...estimatorData,
        },
        'Settlement estimate retrieved successfully',
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Error getting settlement estimator:', error);
      return ResponseFormatter.error(
        'Failed to retrieve settlement estimator',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('history/hourly')
  @ApiOperation({
    summary: 'Get hourly energy history',
    description:
      'Retrieve aggregated hourly energy data for the past N hours (max 1 week)',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    description: 'Number of hours to retrieve (default: 24, max: 168)',
    example: '24',
  })
  @ApiQuery({
    name: 'meterId',
    required: false,
    description: 'Filter by specific meter ID (optional)',
    example: 'SM001',
  })
  @ApiResponse({
    status: 200,
    description: 'Hourly energy history retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              hour: { type: 'string', example: '2025-10-23T10:00:00.000Z' },
              export: { type: 'number', example: 12.5 },
              import: { type: 'number', example: 5.3 },
              net: { type: 'number', example: 7.2 },
              generation: { type: 'number', example: 15.0 },
              consumption: { type: 'number', example: 7.8 },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            hours: { type: 'number', example: 24 },
            meterId: { type: 'string', example: 'all' },
            generatedAt: { type: 'string', example: '2025-10-23T12:00:00Z' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - hours exceeds maximum of 168',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - No energy data available',
  })
  async getHourlyEnergyHistory(
    @Request() req: AuthenticatedUser,
    @Query('hours') hours?: string,
    @Query('meterId') meterId?: string,
  ) {
    try {
      const prosumerId = req.user.prosumerId;
      const hoursCount = hours ? parseInt(hours) : 24; // Default 24 hours

      if (hoursCount > 168) {
        // Max 1 week
        throw new BadRequestException('Maximum 168 hours (1 week) allowed');
      }

      // Get hourly energy history
      const historyData =
        await this.telemetryAggregationService.getHourlyHistory(
          prosumerId,
          hoursCount,
          meterId,
        );

      return ResponseFormatter.successWithMetadata(
        historyData,
        {
          hours: hoursCount,
          meterId: meterId || 'all',
          count: historyData.length,
        },
        'Hourly energy history retrieved successfully',
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Error getting hourly energy history:', error);
      return ResponseFormatter.error(
        'Failed to retrieve hourly energy history',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('chart')
  @ApiOperation({
    summary: 'Get energy chart data',
    description:
      'Retrieve time-series energy data for charts and graphs visualization',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to include in chart (default: 7)',
    example: '7',
  })
  @ApiResponse({
    status: 200,
    description: 'Energy chart data retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timestamp: {
                type: 'string',
                example: '2025-10-23T10:00:00.000Z',
              },
              generation: { type: 'number', example: 12.5 },
              consumption: { type: 'number', example: 8.3 },
              export: { type: 'number', example: 4.2 },
              import: { type: 'number', example: 0.5 },
              battery: { type: 'number', example: 2.1 },
              net: { type: 'number', example: 4.2 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid days parameter',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getEnergyChart(
    @Request() req: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    try {
      const prosumerId = req.user.prosumerId;
      const dayCount = days ? parseInt(days) : 7;

      const chartData = await this.energyAnalyticsService.getEnergyChartData(
        prosumerId,
        dayCount,
      );

      return ResponseFormatter.successWithCount(
        chartData,
        'Energy chart data retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Error getting energy chart data:', error);
      return ResponseFormatter.error(
        'Failed to retrieve energy chart data',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('real-time')
  @ApiOperation({
    summary: 'Get real-time energy data',
    description:
      'Retrieve latest real-time energy measurements from all smart meters',
  })
  @ApiResponse({
    status: 200,
    description: 'Real-time energy data retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            timeSeries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  meterId: { type: 'string', example: 'SM001' },
                  timestamp: {
                    type: 'string',
                    example: '2025-10-23T12:00:00.000Z',
                  },
                  solar: { type: 'number', example: 3.5 },
                  consumption: { type: 'number', example: 2.1 },
                  battery: { type: 'number', example: 0.5 },
                  gridExport: { type: 'number', example: 1.4 },
                  gridImport: { type: 'number', example: 0.0 },
                  netFlow: { type: 'number', example: 1.4 },
                },
              },
            },
            aggregated: {
              type: 'object',
              properties: {
                totalSolar: { type: 'number', example: 10.5 },
                totalConsumption: { type: 'number', example: 6.3 },
                totalBattery: { type: 'number', example: 1.5 },
                totalGridExport: { type: 'number', example: 4.2 },
                totalGridImport: { type: 'number', example: 0.0 },
                totalNetFlow: { type: 'number', example: 4.2 },
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
  @ApiResponse({
    status: 404,
    description: 'Not found - No smart meters found for user',
  })
  async getRealTimeEnergy(@Request() req: AuthenticatedUser) {
    try {
      const prosumerId = req.user.prosumerId;

      const data =
        await this.energyAnalyticsService.getRealTimeEnergyData(prosumerId);

      return ResponseFormatter.success(
        data,
        'Real-time energy data retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Error getting real-time energy data:', error);
      return ResponseFormatter.error(
        'Failed to retrieve real-time energy data',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get comprehensive energy summary',
    description:
      'Aggregated energy statistics with generation, consumption, and settlement data',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['daily', 'weekly', 'monthly'],
    description: 'Summary period (default: daily)',
    example: 'daily',
  })
  @ApiResponse({
    status: 200,
    description: 'Energy summary retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            period: { type: 'string', example: 'daily' },
            generation: {
              type: 'object',
              properties: {
                today: { type: 'number', example: 45.5 },
                total: { type: 'number', example: 1250.8 },
                gridExport: { type: 'number', example: 12.3 },
              },
            },
            consumption: {
              type: 'object',
              properties: {
                today: { type: 'number', example: 35.2 },
                total: { type: 'number', example: 980.5 },
                gridImport: { type: 'number', example: 5.8 },
              },
            },
            net: {
              type: 'object',
              properties: {
                energy: { type: 'number', example: 270.3 },
                gridEnergy: { type: 'number', example: 6.5 },
              },
            },
            chartData: {
              type: 'array',
              items: { type: 'object' },
            },
            settlements: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 150 },
                today: { type: 'number', example: 12 },
                etkMinted: { type: 'number', example: 1250.8 },
                etkBurned: { type: 'number', example: 980.5 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid period parameter',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getEnergySummary(
    @Request() req: AuthenticatedUser,
    @Query('period') period?: 'daily' | 'weekly' | 'monthly',
  ) {
    try {
      const prosumerId = req.user.prosumerId;
      const summaryPeriod = period || 'daily';

      const data = await this.energyAnalyticsService.getEnergySummary(
        prosumerId,
        summaryPeriod,
      );

      return ResponseFormatter.success(
        data,
        'Energy summary retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Error getting energy summary:', error);
      return ResponseFormatter.error(
        'Failed to retrieve energy summary',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
