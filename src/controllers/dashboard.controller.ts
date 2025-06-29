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
  DashboardService,
  DashboardStats,
} from '../services/dashboard.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';

interface AuthenticatedUser {
  user: {
    prosumerId: string;
  };
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @Header('Cache-Control', 'public, max-age=60') // Cache for 1 minute
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

  @Get('energy-chart')
  @Header('Cache-Control', 'public, max-age=300') // Cache for 5 minutes
  async getEnergyChartData(
    @Request() req: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    const prosumerId = req.user.prosumerId;
    const dayCount = days ? parseInt(days) : 7;

    const chartData = await this.dashboardService.getEnergyChartData(
      prosumerId,
      dayCount,
    );

    return {
      success: true,
      data: chartData,
    };
  }

  @Get('real-time-energy')
  async getRealTimeEnergyData(@Request() req: AuthenticatedUser) {
    const prosumerId = req.user.prosumerId;

    this.logger.debug(
      `Fetching real-time energy data for prosumer ${prosumerId}`,
    );

    const realTimeData =
      await this.dashboardService.getRealTimeEnergyData(prosumerId);

    return {
      success: true,
      data: realTimeData,
    };
  }

  @Get('settlement-recommendations')
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
  async getBlockchainSyncStatus(@Request() req: AuthenticatedUser) {
    const prosumerId = req.user.prosumerId;

    const syncStatus =
      await this.dashboardService.getBlockchainSyncStatus(prosumerId);

    return {
      success: true,
      data: syncStatus,
    };
  }

  @Get('device-health')
  async getDeviceHealthStatus(@Request() req: AuthenticatedUser) {
    const prosumerId = req.user.prosumerId;

    try {
      // Get basic device health from existing dashboard stats
      const stats = await this.dashboardService.getDashboardStats(prosumerId);

      const deviceHealth = {
        totalDevices: stats.deviceStatus.totalDevices,
        onlineDevices: stats.deviceStatus.onlineDevices,
        offlineDevices:
          stats.deviceStatus.totalDevices - stats.deviceStatus.onlineDevices,
        healthPercentage:
          stats.deviceStatus.totalDevices > 0
            ? Math.round(
                (stats.deviceStatus.onlineDevices /
                  stats.deviceStatus.totalDevices) *
                  100,
              )
            : 0,
        lastHeartbeat: stats.deviceStatus.lastHeartbeat,
        averageUptime: stats.deviceStatus.averageUptime,
        authorizedDevices: stats.deviceStatus.authorizedDevices,
        settlementsToday: stats.deviceStatus.settlementsToday,
      };

      return {
        success: true,
        data: deviceHealth,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve device health status',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('energy-summary')
  async getEnergySummary(
    @Request() req: AuthenticatedUser,
    @Query('period') period?: 'daily' | 'weekly' | 'monthly',
  ) {
    const prosumerId = req.user.prosumerId;
    const summaryPeriod = period || 'daily';

    try {
      // Get energy summary from existing dashboard stats and chart data
      const [stats, chartData] = await Promise.all([
        this.dashboardService.getDashboardStats(prosumerId),
        this.dashboardService.getEnergyChartData(
          prosumerId,
          summaryPeriod === 'weekly' ? 7 : 30,
        ),
      ]);

      const energySummary = {
        period: summaryPeriod,
        generation: {
          today: stats.energyStats.todayGeneration,
          total: stats.energyStats.totalGeneration,
          gridExport: stats.energyStats.todayGridExport,
        },
        consumption: {
          today: stats.energyStats.todayConsumption,
          total: stats.energyStats.totalConsumption,
          gridImport: stats.energyStats.todayGridImport,
        },
        net: {
          energy: stats.energyStats.netEnergy,
          gridEnergy: stats.energyStats.netGridEnergy,
        },
        chartData: chartData,
        settlements: {
          total: stats.settlementStats.totalSettlements,
          today: stats.settlementStats.todaySettlements,
          etkMinted: stats.settlementStats.totalEtkMinted,
          etkBurned: stats.settlementStats.totalEtkBurned,
        },
      };

      return {
        success: true,
        data: energySummary,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve energy summary',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('trading-performance')
  async getTradingPerformance(
    @Request() req: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    const prosumerId = req.user.prosumerId;
    const dayCount = days ? parseInt(days) : 30;

    try {
      // Get trading performance from existing dashboard stats
      const stats = await this.dashboardService.getDashboardStats(prosumerId);

      const tradingPerformance = {
        period: `${dayCount} days`,
        summary: {
          totalTrades: stats.tradingStats.totalTrades,
          totalVolume: stats.tradingStats.totalVolume,
          averagePrice: stats.tradingStats.averagePrice,
          last24hVolume: stats.tradingStats.last24hVolume,
        },
        financial: {
          totalEarnings: stats.tradingStats.totalEarnings,
          totalSpending: stats.tradingStats.totalSpending,
          netProfit: stats.tradingStats.netProfit,
          profitMargin:
            stats.tradingStats.totalEarnings > 0
              ? Math.round(
                  (stats.tradingStats.netProfit /
                    stats.tradingStats.totalEarnings) *
                    100,
                )
              : 0,
        },
        balances: stats.balances,
      };

      return {
        success: true,
        data: tradingPerformance,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve trading performance',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('system-overview')
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
