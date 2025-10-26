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
import {
  DashboardStatsDto,
  EnergyChartDataDto,
  RealTimeEnergyDto,
  SettlementRecommendationDto,
  BlockchainSyncStatusDto,
} from '../common/dto/dashboard.dto';

interface AuthenticatedUser {
  user: {
    prosumerId: string;
  };
}

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

  @Get('energy-chart')
  @Header('Cache-Control', 'public, max-age=300') // Cache for 5 minutes
  @ApiOperation({
    summary:
      '[DEPRECATED] Get energy chart data - Use GET /energy/chart instead',
    description:
      'DEPRECATED: This endpoint will be removed. Use GET /energy/chart instead. Retrieve time-series energy data for dashboard charts',
    deprecated: true,
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
    type: EnergyChartDataDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid days parameter',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to retrieve chart data',
  })
  async getEnergyChartData(
    @Request() req: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    this.logger.warn(
      'DEPRECATED: /dashboard/energy-chart is deprecated. Use /energy/chart instead.',
    );
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
  @ApiOperation({
    summary:
      '[DEPRECATED] Get real-time energy data - Use GET /energy/real-time instead',
    description:
      'DEPRECATED: This endpoint will be removed. Use GET /energy/real-time instead. Retrieve latest real-time energy measurements from smart meters',
    deprecated: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Real-time energy data retrieved successfully',
    type: [RealTimeEnergyDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - No smart meters found for user',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to retrieve real-time data',
  })
  async getRealTimeEnergyData(@Request() req: AuthenticatedUser) {
    this.logger.warn(
      'DEPRECATED: /dashboard/real-time-energy is deprecated. Use /energy/real-time instead.',
    );
    const prosumerId = req.user.prosumerId;

    // this.logger.debug(
    //   `Fetching real-time energy data for prosumer ${prosumerId}`,
    // );

    const realTimeData =
      await this.dashboardService.getRealTimeEnergyData(prosumerId);

    return {
      success: true,
      data: realTimeData,
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

  @Get('device-health')
  @ApiOperation({
    summary:
      '[DEPRECATED] Get device health status - Use GET /device/health instead',
    description:
      'DEPRECATED: This endpoint will be removed. Use GET /device/health instead. Monitor smart meter health, uptime, and connectivity status',
    deprecated: true,
  })
  @ApiQuery({
    name: 'includeOffline',
    required: false,
    description: 'When true, include offline device details in response',
    example: 'false',
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
              example: '2025-07-19T12:00:00.000Z',
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
  async getDeviceHealthStatus(@Request() req: AuthenticatedUser) {
    this.logger.warn(
      'DEPRECATED: /dashboard/device-health is deprecated. Use /device/health instead.',
    );
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
  @ApiOperation({
    summary:
      '[DEPRECATED] Get energy summary - Use GET /energy/summary instead',
    description:
      'DEPRECATED: This endpoint will be removed. Use GET /energy/summary instead. Comprehensive energy statistics with generation, consumption, and settlement data',
    deprecated: true,
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
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to retrieve energy summary',
  })
  async getEnergySummary(
    @Request() req: AuthenticatedUser,
    @Query('period') period?: string,
  ) {
    this.logger.warn(
      'DEPRECATED: /dashboard/energy-summary is deprecated. Use /energy/summary instead.',
    );
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
  @ApiOperation({
    summary:
      '[DEPRECATED] Get trading performance metrics - Use GET /trading/performance instead',
    description:
      'DEPRECATED: This endpoint will be removed. Use GET /trading/performance instead. Detailed trading statistics including volume, earnings, and profitability',
    deprecated: true,
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days for performance analysis (default: 30)',
    example: '30',
  })
  @ApiResponse({
    status: 200,
    description: 'Trading performance retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            period: { type: 'string', example: '30 days' },
            summary: {
              type: 'object',
              properties: {
                totalTrades: { type: 'number', example: 45 },
                totalVolume: { type: 'string', example: '1250.5' },
                averagePrice: { type: 'string', example: '1500.0' },
                last24hVolume: { type: 'string', example: '125.5' },
              },
            },
            financial: {
              type: 'object',
              properties: {
                totalEarnings: { type: 'string', example: '5000000.0' },
                totalSpending: { type: 'string', example: '3500000.0' },
                netProfit: { type: 'string', example: '1500000.0' },
                profitMargin: { type: 'number', example: 30 },
              },
            },
            balances: {
              type: 'object',
              properties: {
                etkBalance: { type: 'string', example: '150.5' },
                idrsBalance: { type: 'string', example: '2500000.0' },
              },
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
  @ApiResponse({
    status: 500,
    description:
      'Internal server error - Failed to retrieve trading performance',
  })
  async getTradingPerformance(
    @Request() req: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    this.logger.warn(
      'DEPRECATED: /dashboard/trading-performance is deprecated. Use /trading/performance instead.',
    );
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
