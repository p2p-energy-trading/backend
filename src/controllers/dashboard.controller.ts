import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  Logger,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  DashboardService,
  DashboardStats,
} from '../services/dashboard.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { AuthenticatedUser } from '../common/interfaces';
import {
  DashboardStatsDto,
  SettlementRecommendationDto,
  BlockchainSyncStatusDto,
} from '../common/dto/dashboard.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @Header('Cache-Control', 'public, max-age=60') // Cache for 1 minute
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description:
      'Retrieve comprehensive dashboard statistics including balances, energy, trading, and devices',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to retrieve statistics',
  })
  async getDashboardStats(
    @Request() req: AuthenticatedUser,
  ): Promise<{ success: boolean; data: DashboardStats }> {
    const prosumerId = req.user.prosumerId;
    const stats = await this.dashboardService.getDashboardStats(prosumerId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('settlement-recommendations')
  @ApiOperation({
    summary: 'Get settlement recommendations',
    description:
      'Retrieve recommendations for energy settlements based on accumulated data',
  })
  @ApiResponse({
    status: 200,
    description: 'Settlement recommendations retrieved successfully',
    type: [SettlementRecommendationDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to generate recommendations',
  })
  async getSettlementRecommendations(@Request() req: AuthenticatedUser) {
    const prosumerId = req.user.prosumerId;

    const recommendations =
      await this.dashboardService.getSettlementRecommendations(prosumerId);

    return {
      success: true,
      data: recommendations,
    };
  }

  @Get('blockchain-sync-status')
  @ApiOperation({
    summary: 'Get blockchain sync status',
    description:
      'Check blockchain synchronization status and pending transactions',
  })
  @ApiResponse({
    status: 200,
    description: 'Blockchain sync status retrieved successfully',
    type: BlockchainSyncStatusDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to check blockchain status',
  })
  async getBlockchainSyncStatus(@Request() req: AuthenticatedUser) {
    const prosumerId = req.user.prosumerId;

    const syncStatus =
      await this.dashboardService.getBlockchainSyncStatus(prosumerId);

    return {
      success: true,
      data: syncStatus,
    };
  }

  @Get('system-overview')
  @ApiOperation({
    summary: 'Get comprehensive system overview',
    description:
      'Complete system status including energy, devices, trading, and blockchain',
  })
  @ApiResponse({
    status: 200,
    description: 'System overview retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            energy: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['surplus', 'deficit'],
                  example: 'surplus',
                },
                efficiency: { type: 'number', example: 85 },
                todayNet: { type: 'number', example: 10.3 },
              },
            },
            devices: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['all_online', 'partial', 'all_offline'],
                  example: 'partial',
                },
                onlineCount: { type: 'number', example: 2 },
                totalCount: { type: 'number', example: 3 },
              },
            },
            trading: {
              type: 'object',
              properties: {
                activeOrders: { type: 'number', example: 5 },
                todayTrades: { type: 'number', example: 8 },
                marketStatus: { type: 'string', example: 'active' },
              },
            },
            blockchain: {
              type: 'object',
              properties: {
                syncStatus: { type: 'string', example: 'synced' },
                pendingTx: { type: 'number', example: 2 },
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
    status: 500,
    description: 'Internal server error - Failed to retrieve system overview',
  })
  async getSystemOverview(@Request() req: AuthenticatedUser) {
    const prosumerId = req.user.prosumerId;

    try {
      // Get comprehensive system overview
      const stats = await this.dashboardService.getDashboardStats(prosumerId);

      const systemOverview = {
        energy: {
          status: stats.energyStats.netEnergy >= 0 ? 'surplus' : 'deficit',
          efficiency:
            stats.energyStats.totalGeneration > 0
              ? Math.round(
                  (stats.energyStats.netEnergy /
                    stats.energyStats.totalGeneration) *
                    100,
                )
              : 0,
          todayNet:
            stats.energyStats.todayGeneration -
            stats.energyStats.todayConsumption,
        },
        devices: {
          status:
            stats.deviceStatus.onlineDevices === stats.deviceStatus.totalDevices
              ? 'all_online'
              : stats.deviceStatus.onlineDevices > 0
                ? 'partial_online'
                : 'all_offline',
          healthScore:
            stats.deviceStatus.totalDevices > 0
              ? Math.round(
                  (stats.deviceStatus.onlineDevices /
                    stats.deviceStatus.totalDevices) *
                    100,
                )
              : 0,
        },
        trading: {
          status: stats.tradingStats.totalTrades > 0 ? 'active' : 'inactive',
          profitability:
            stats.tradingStats.netProfit >= 0 ? 'profitable' : 'loss',
        },
        blockchain: {
          settlements: stats.settlementStats.totalSettlements,
          pendingSettlements: stats.settlementStats.pendingSettlements,
          syncStatus:
            stats.settlementStats.pendingSettlements === 0
              ? 'synced'
              : 'pending',
        },
      };

      return {
        success: true,
        data: systemOverview,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve system overview',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
