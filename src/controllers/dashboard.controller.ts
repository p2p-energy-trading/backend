import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import {
  DashboardService,
  DashboardStats,
} from '../services/dashboard.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getDashboardStats(
    @Request() req,
  ): Promise<{ success: boolean; data: DashboardStats }> {
    const prosumerId = req.user.prosumerId;
    const stats = await this.dashboardService.getDashboardStats(prosumerId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('energy-chart')
  async getEnergyChartData(@Request() req, @Query('days') days?: string) {
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
}
