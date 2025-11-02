import {
  Controller,
  Get,
  UseGuards,
  Request,
  Logger,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StatService, StatStats } from '../../services/stat/stat.service';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { AuthenticatedUser, ApiSuccessResponse } from '../../common/interfaces';
import { ResponseFormatter } from '../../common/response-formatter';
import {
  DashboardStatsResponseDto,
  SettlementRecommendationsResponseDto,
  BlockchainSyncStatusDto,
  SystemOverviewResponseDto,
} from '../../common/dto/dashboard.dto';

@ApiTags('Statistics')
@ApiBearerAuth('JWT-auth')
@Controller('stat')
@UseGuards(JwtAuthGuard)
export class StatController {
  private readonly logger = new Logger(StatController.name);

  constructor(private statService: StatService) {}

  @Get('stats')
  @Header('Cache-Control', 'public, max-age=60') // Cache for 1 minute
  @ApiOperation({
    summary: 'Get statistics',
    description:
      'Retrieve comprehensive statistics including balances, energy, trading, and devices',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: DashboardStatsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to retrieve statistics',
  })
  async getStats(
    @Request() req: AuthenticatedUser,
  ): Promise<ApiSuccessResponse<StatStats>> {
    const userId = req.user.userId;
    const stats = await this.statService.getStats(userId);

    return ResponseFormatter.success(
      stats,
      'Statistics retrieved successfully',
    );
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
    type: SettlementRecommendationsResponseDto,
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
    const userId = req.user.userId;

    const recommendations =
      await this.statService.getSettlementRecommendations(userId);

    return ResponseFormatter.successWithCount(
      recommendations,
      'Settlement recommendations retrieved successfully',
    );
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
    const userId = req.user.userId;

    const syncStatus = await this.statService.getBlockchainSyncStatus(userId);

    return ResponseFormatter.success(
      syncStatus,
      'Blockchain sync status retrieved successfully',
    );
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
    type: SystemOverviewResponseDto,
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
    try {
      const userId = req.user.userId;

      // Get comprehensive system overview
      const stats = await this.statService.getStats(userId);

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

      return ResponseFormatter.success(
        systemOverview,
        'System overview retrieved successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to get system overview: ${error.message}`,
        error.stack,
      );
      return ResponseFormatter.error(
        'Failed to retrieve system overview',
        error.message,
      );
    }
  }
}
