import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelemetryAggregate } from '../../models/telemetryAggregate/telemetryAggregate.entity';
import { RedisTelemetryService } from '../telemetry/redis-telemetry.service';
import { EnergySettlementsService } from '../../models/energySettlement/energySettlement.service';
import { SmartMetersService } from '../../models/smartMeter/smartMeter.service';

/**
 * Service for energy analytics and calculations
 * Extracted from DashboardService to follow Single Responsibility Principle
 */
@Injectable()
export class EnergyAnalyticsService {
  private readonly logger = new Logger(EnergyAnalyticsService.name);

  constructor(
    @InjectRepository(TelemetryAggregate)
    private telemetryAggregateRepository: Repository<TelemetryAggregate>,
    private redisTelemetryService: RedisTelemetryService,
    private energySettlementsService: EnergySettlementsService,
    private smartMetersService: SmartMetersService,
  ) {}

  /**
   * Get energy statistics for a user
   * Calculates today's and total generation/consumption from TimescaleDB
   */
  async getEnergyStats(userId: string) {
    try {
      // Get user's meters
      const devices = await this.smartMetersService.findAll({ userId });
      const meterIds: string[] = devices.map(
        (d: { meterId: string }) => d.meterId,
      );

      if (meterIds.length === 0) {
        return this.getEmptyEnergyStats();
      }

      // Get today's start timestamp
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Query TimescaleDB for today's totals
      const todayAggregates = await this.telemetryAggregateRepository
        .createQueryBuilder('agg')
        .where('agg.meterId IN (:...meterIds)', { meterIds })
        .andWhere('agg.hourStart >= :todayStart', { todayStart })
        .getMany();

      // Query TimescaleDB for all-time totals
      const allAggregates = await this.telemetryAggregateRepository
        .createQueryBuilder('agg')
        .where('agg.meterId IN (:...meterIds)', { meterIds })
        .getMany();

      // Calculate today's totals (convert Wh to kWh)
      const todayGeneration =
        todayAggregates.reduce(
          (sum, agg) => sum + (Number(agg.solarOutputEnergyTotal) || 0),
          0,
        ) / 1000;
      const todayConsumption =
        todayAggregates.reduce(
          (sum, agg) =>
            sum +
            (Number(agg.loadSmartEnergyTotal) || 0) +
            (Number(agg.loadHomeEnergyTotal) || 0),
          0,
        ) / 1000;
      const todayGridExport =
        todayAggregates.reduce(
          (sum, agg) => sum + (Number(agg.exportEnergyTotal) || 0),
          0,
        ) / 1000;
      const todayGridImport =
        todayAggregates.reduce(
          (sum, agg) => sum + (Number(agg.importEnergyTotal) || 0),
          0,
        ) / 1000;

      // Calculate all-time totals (convert Wh to kWh)
      const totalGeneration =
        allAggregates.reduce(
          (sum, agg) => sum + (Number(agg.solarOutputEnergyTotal) || 0),
          0,
        ) / 1000;
      const totalConsumption =
        allAggregates.reduce(
          (sum, agg) =>
            sum +
            (Number(agg.loadSmartEnergyTotal) || 0) +
            (Number(agg.loadHomeEnergyTotal) || 0),
          0,
        ) / 1000;
      const totalGridExport =
        allAggregates.reduce(
          (sum, agg) => sum + (Number(agg.exportEnergyTotal) || 0),
          0,
        ) / 1000;
      const totalGridImport =
        allAggregates.reduce(
          (sum, agg) => sum + (Number(agg.importEnergyTotal) || 0),
          0,
        ) / 1000;

      return {
        todayGeneration: Math.round(todayGeneration * 100) / 100,
        todayConsumption: Math.round(todayConsumption * 100) / 100,
        totalGeneration: Math.round(totalGeneration * 100) / 100,
        totalConsumption: Math.round(totalConsumption * 100) / 100,
        netEnergy: Math.round((totalGeneration - totalConsumption) * 100) / 100,
        todayGridExport: Math.round(todayGridExport * 100) / 100,
        todayGridImport: Math.round(todayGridImport * 100) / 100,
        totalGridExport: Math.round(totalGridExport * 100) / 100,
        totalGridImport: Math.round(totalGridImport * 100) / 100,
        netGridEnergy:
          Math.round((totalGridExport - totalGridImport) * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Error getting energy stats:', error);
      return this.getEmptyEnergyStats();
    }
  }

  /**
   * Get energy chart data for time-series visualization
   * Retrieves hourly aggregated data from TimescaleDB
   */
  async getEnergyChartData(userId: string, days: number = 7) {
    try {
      // Get user's meters
      const devices = await this.smartMetersService.findAll({ userId });
      const meterIds: string[] = devices.map(
        (d: { meterId: string }) => d.meterId,
      );

      if (meterIds.length === 0) {
        return [];
      }

      // Calculate time range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Query TimescaleDB for aggregated data
      const aggregates = await this.telemetryAggregateRepository
        .createQueryBuilder('agg')
        .where('agg.meterId IN (:...meterIds)', { meterIds })
        .andWhere('agg.hourStart >= :startDate', { startDate })
        .andWhere('agg.hourStart <= :endDate', { endDate })
        .orderBy('agg.hourStart', 'ASC')
        .getMany();

      // Group by hour and sum across all meters
      const hourlyData = new Map<
        string,
        {
          generation: number;
          consumption: number;
          export: number;
          import: number;
          battery: number;
        }
      >();

      for (const agg of aggregates) {
        const hourKey = agg.hourStart.toISOString();
        const existing = hourlyData.get(hourKey) || {
          generation: 0,
          consumption: 0,
          export: 0,
          import: 0,
          battery: 0,
        };

        hourlyData.set(hourKey, {
          generation:
            existing.generation +
            (Number(agg.solarOutputEnergyTotal) || 0) / 1000,
          consumption:
            existing.consumption +
            ((Number(agg.loadSmartEnergyTotal) || 0) +
              (Number(agg.loadHomeEnergyTotal) || 0)) /
              1000,
          export: existing.export + (Number(agg.exportEnergyTotal) || 0) / 1000,
          import: existing.import + (Number(agg.importEnergyTotal) || 0) / 1000,
          battery:
            existing.battery + (Number(agg.netSolarEnergyTotal) || 0) / 1000,
        });
      }

      // Convert to array format
      return Array.from(hourlyData.entries()).map(([timestamp, data]) => ({
        timestamp,
        generation: Math.round(data.generation * 100) / 100,
        consumption: Math.round(data.consumption * 100) / 100,
        export: Math.round(data.export * 100) / 100,
        import: Math.round(data.import * 100) / 100,
        battery: Math.round(data.battery * 100) / 100,
        net: Math.round((data.generation - data.consumption) * 100) / 100,
      }));
    } catch (error) {
      this.logger.error('Error getting energy chart data:', error);
      return [];
    }
  }

  /**
   * Get real-time energy data from Redis
   * Returns latest measurements and historical snapshots for real-time charting
   * @param userId User ID
   * @param dataPoints Number of historical data points to include (default: 20)
   * @param meterId Optional specific meter ID (default: first meter)
   */
  async getRealTimeEnergyData(
    userId: string,
    dataPoints: number = 20,
    meterId?: string,
  ) {
    try {
      // Get user's meters
      const devices = await this.smartMetersService.findAll({ userId });
      const meterIds: string[] = devices.map(
        (d: { meterId: string }) => d.meterId,
      );

      if (meterIds.length === 0) {
        return { timeSeries: [], aggregated: this.getEmptyRealTimeData() };
      }

      // Determine which meter to use
      let targetMeterId: string;
      if (meterId) {
        // Verify meter belongs to user
        if (!meterIds.includes(meterId)) {
          this.logger.warn(
            `Meter ${meterId} does not belong to user ${userId}`,
          );
          return { timeSeries: [], aggregated: this.getEmptyRealTimeData() };
        }
        targetMeterId = meterId;
      } else {
        // Use first meter as default
        targetMeterId = meterIds[0];
      }

      // Get latest snapshots from Redis for the selected meter only
      const snapshots = await this.redisTelemetryService.getLatestSnapshots(
        targetMeterId,
        dataPoints,
      );

      // Build time series data from snapshots
      const timeSeries = snapshots
        .filter((snapshot) => snapshot.meterData?.data) // Only snapshots with valid data
        .map((snapshot) => {
          const data = snapshot.meterData!.data;
          return {
            meterId: targetMeterId,
            timestamp: snapshot.datetime || new Date().toISOString(),
            solar: Number(data.solar_output?.power || 0) / 1000, // Convert W to kW
            consumption:
              (Number(data.load_smart_mtr?.power || 0) +
                Number(data.load_home?.power || 0)) /
              1000,
            battery: {
              power: Number(data.battery?.charge_rate || 0), // Power in W (negative = discharging, positive = charging)
              voltage: Number(data.battery?.voltage || 0), // Voltage in V
              soc: Number(data.battery?.soc || 0), // State of Charge in percentage (0-100)
              chargeRate: Number(data.battery?.charge_rate || 0), // Charge rate in W
              isCharging: Boolean(data.battery?.is_charging || false), // Charging status
              estimatedCapacity: Number(data.battery?.estimated_capacity || 0), // Estimated capacity in Wh
              alertThreshold: Number(data.battery?.alert_threshold || 0), // Low battery alert threshold
              alertActive: Boolean(data.battery?.alert_active || false), // Alert status
              connected: Boolean(data.battery?.connected || false), // Battery connection status
              valid: Boolean(data.battery?.valid || false), // Data validity
            },
            gridExport: Number(data.export?.power || 0) / 1000,
            gridImport: Number(data.import?.power || 0) / 1000,
            netFlow:
              (Number(data.solar_output?.power || 0) -
                (Number(data.load_smart_mtr?.power || 0) +
                  Number(data.load_home?.power || 0))) /
              1000,
            settlementEnergyWh: {
              export: Number(data.export?.settlement_energy || 0) / 1000, // Convert Wh to kWh
              import: Number(data.import?.settlement_energy || 0) / 1000,
            },
          };
        });

      // Sort by timestamp descending (newest first)
      timeSeries.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      // Calculate aggregated totals from latest data point
      const latestData = timeSeries.length > 0 ? timeSeries[0] : null;
      const aggregated = latestData
        ? {
            totalSolar: latestData.solar,
            totalConsumption: latestData.consumption,
            totalBatteryPower: latestData.battery.power,
            averageBatterySoc: latestData.battery.soc,
            totalGridExport: latestData.gridExport,
            totalGridImport: latestData.gridImport,
            totalNetFlow: latestData.netFlow,
          }
        : this.getEmptyRealTimeData();

      return {
        timeSeries,
        aggregated: {
          totalSolar: Math.round(aggregated.totalSolar * 100) / 100,
          totalConsumption: Math.round(aggregated.totalConsumption * 100) / 100,
          totalBatteryPower:
            Math.round(aggregated.totalBatteryPower * 100) / 100,
          averageBatterySoc: Math.round(aggregated.averageBatterySoc * 10) / 10,
          totalGridExport: Math.round(aggregated.totalGridExport * 100) / 100,
          totalGridImport: Math.round(aggregated.totalGridImport * 100) / 100,
          totalNetFlow: Math.round(aggregated.totalNetFlow * 100) / 100,
        },
      };
    } catch (error) {
      this.logger.error('Error getting real-time energy data:', error);
      return { timeSeries: [], aggregated: this.getEmptyRealTimeData() };
    }
  }

  /**
   * Get comprehensive energy summary
   * Combines stats, chart data, and settlement information
   */
  async getEnergySummary(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    try {
      const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;

      const [stats, chartData, settlements] = await Promise.all([
        this.getEnergyStats(userId),
        this.getEnergyChartData(userId, days),
        this.getSettlementStats(userId),
      ]);

      return {
        period,
        generation: {
          today: stats.todayGeneration,
          total: stats.totalGeneration,
          gridExport: stats.todayGridExport,
        },
        consumption: {
          today: stats.todayConsumption,
          total: stats.totalConsumption,
          gridImport: stats.todayGridImport,
        },
        net: {
          energy: stats.netEnergy,
          gridEnergy: stats.netGridEnergy,
        },
        chartData,
        settlements: {
          total: settlements.totalSettlements,
          today: settlements.todaySettlements,
          etkMinted: settlements.totalEtkMinted,
          etkBurned: settlements.totalEtkBurned,
        },
      };
    } catch (error) {
      this.logger.error('Error getting energy summary:', error);
      throw error;
    }
  }

  /**
   * Get settlement statistics
   */
  async getSettlementStats(userId: string) {
    try {
      // Get user's meters
      const devices = await this.smartMetersService.findAll({ userId });
      const meterIds: string[] = devices.map(
        (d: { meterId: string }) => d.meterId,
      );

      if (meterIds.length === 0) {
        return this.getEmptySettlementStats();
      }

      // Get all settlements
      const allSettlements = await this.energySettlementsService.findAll();

      // Filter settlements for user's meters
      const userSettlements = allSettlements.filter((s: any) =>
        meterIds.includes((s as { meterId?: string })?.meterId || ''),
      );

      // Get today's start
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todaySettlements = userSettlements.filter((s: any) => {
        const createdAt = (s as { createdAtBackend?: string | Date })
          ?.createdAtBackend;
        if (!createdAt) return false;
        const date = new Date(createdAt);
        return date >= todayStart;
      });

      const successfulSettlements = userSettlements.filter(
        (s: any) =>
          ((s as { status?: string })?.status || '').toUpperCase() ===
          'SUCCESS',
      );

      const pendingSettlements = userSettlements.filter(
        (s: any) =>
          ((s as { status?: string })?.status || '').toUpperCase() ===
          'PENDING',
      );

      // Calculate total ETK minted/burned
      let totalEtkMinted = 0;
      let totalEtkBurned = 0;

      for (const settlement of successfulSettlements) {
        const etkAmount = Number(
          (settlement as { etkAmountCredited?: number })?.etkAmountCredited ||
            0,
        );
        if (etkAmount > 0) {
          totalEtkMinted += etkAmount;
        } else if (etkAmount < 0) {
          totalEtkBurned += Math.abs(etkAmount);
        }
      }

      // Get last settlement time
      const sortedSettlements = [...userSettlements].sort((a: any, b: any) => {
        const timeA = (a as { createdAtBackend?: string | Date })
          ?.createdAtBackend
          ? new Date(
              (a as { createdAtBackend?: string | Date }).createdAtBackend!,
            ).getTime()
          : 0;
        const timeB = (b as { createdAtBackend?: string | Date })
          ?.createdAtBackend
          ? new Date(
              (b as { createdAtBackend?: string | Date }).createdAtBackend!,
            ).getTime()
          : 0;
        return timeB - timeA;
      });

      const lastSettlementTime =
        sortedSettlements.length > 0
          ? (sortedSettlements[0] as { createdAtBackend?: string | Date })
              ?.createdAtBackend
          : null;

      return {
        totalSettlements: userSettlements.length,
        successfulSettlements: successfulSettlements.length,
        pendingSettlements: pendingSettlements.length,
        todaySettlements: todaySettlements.length,
        lastSettlementTime: lastSettlementTime
          ? typeof lastSettlementTime === 'string'
            ? lastSettlementTime
            : lastSettlementTime.toISOString()
          : null,
        totalEtkMinted: Math.round(totalEtkMinted * 1000) / 1000,
        totalEtkBurned: Math.round(totalEtkBurned * 1000) / 1000,
      };
    } catch (error) {
      this.logger.error('Error getting settlement stats:', error);
      return this.getEmptySettlementStats();
    }
  }

  /**
   * Get hourly energy history
   * Note: This method is deprecated in EnergySettlementService
   * Returns empty array as hourly data should come from TelemetryAggregate
   */
  async getHourlyEnergyHistory(
    userId: string,
    hours: number = 24,
    meterId?: string,
  ): Promise<
    Array<{
      hour: string;
      timestamp: string;
      solar: number;
      consumption: number;
      battery: number;
      gridExport: number;
      gridImport: number;
      net: number;
    }>
  > {
    try {
      // Get user's meters
      const devices = await this.smartMetersService.findAll({ userId });
      let meterIds: string[] = devices.map(
        (d: { meterId: string }) => d.meterId,
      );

      if (meterId) {
        // Verify meter belongs to user
        if (!meterIds.includes(meterId)) {
          this.logger.warn(
            `Meter ${meterId} does not belong to user ${userId}`,
          );
          return [];
        }
        meterIds = [meterId];
      }

      if (meterIds.length === 0) {
        return [];
      }

      // Calculate time range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);

      // Query TimescaleDB for hourly aggregates
      const aggregates = await this.telemetryAggregateRepository
        .createQueryBuilder('agg')
        .where('agg.meterId IN (:...meterIds)', { meterIds })
        .andWhere('agg.hourStart >= :startDate', { startDate })
        .andWhere('agg.hourStart <= :endDate', { endDate })
        .orderBy('agg.hourStart', 'ASC')
        .getMany();

      // Group by hour
      const hourlyData = new Map<
        string,
        {
          solar: number;
          consumption: number;
          battery: number;
          gridExport: number;
          gridImport: number;
        }
      >();

      for (const agg of aggregates) {
        const hourKey = agg.hourStart.toISOString();
        const existing = hourlyData.get(hourKey) || {
          solar: 0,
          consumption: 0,
          battery: 0,
          gridExport: 0,
          gridImport: 0,
        };

        hourlyData.set(hourKey, {
          solar:
            existing.solar + (Number(agg.solarOutputEnergyTotal) || 0) / 1000,
          consumption:
            existing.consumption +
            ((Number(agg.loadSmartEnergyTotal) || 0) +
              (Number(agg.loadHomeEnergyTotal) || 0)) /
              1000,
          battery:
            existing.battery + (Number(agg.netSolarEnergyTotal) || 0) / 1000,
          gridExport:
            existing.gridExport + (Number(agg.exportEnergyTotal) || 0) / 1000,
          gridImport:
            existing.gridImport + (Number(agg.importEnergyTotal) || 0) / 1000,
        });
      }

      // Convert to array format
      return Array.from(hourlyData.entries()).map(([timestamp, data]) => {
        const date = new Date(timestamp);
        return {
          hour: `${date.getHours().toString().padStart(2, '0')}:00`,
          timestamp,
          solar: Math.round(data.solar * 100) / 100,
          consumption: Math.round(data.consumption * 100) / 100,
          battery: Math.round(data.battery * 100) / 100,
          gridExport: Math.round(data.gridExport * 100) / 100,
          gridImport: Math.round(data.gridImport * 100) / 100,
          net: Math.round((data.solar - data.consumption) * 100) / 100,
        };
      });
    } catch (error) {
      this.logger.error('Error getting hourly energy history:', error);
      return [];
    }
  }

  // Helper methods for empty states
  private getEmptyEnergyStats() {
    return {
      todayGeneration: 0,
      todayConsumption: 0,
      totalGeneration: 0,
      totalConsumption: 0,
      netEnergy: 0,
      todayGridExport: 0,
      todayGridImport: 0,
      totalGridExport: 0,
      totalGridImport: 0,
      netGridEnergy: 0,
    };
  }

  private getEmptyRealTimeData() {
    return {
      totalSolar: 0,
      totalConsumption: 0,
      totalBatteryPower: 0,
      averageBatterySoc: 0,
      totalGridExport: 0,
      totalGridImport: 0,
      totalNetFlow: 0,
    };
  }

  private getEmptySettlementStats() {
    return {
      totalSettlements: 0,
      successfulSettlements: 0,
      pendingSettlements: 0,
      todaySettlements: 0,
      lastSettlementTime: null,
      totalEtkMinted: 0,
      totalEtkBurned: 0,
    };
  }
}
