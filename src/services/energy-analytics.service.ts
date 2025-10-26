import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelemetryAggregate } from '../models/TelemetryAggregate/TelemetryAggregate.entity';
import { RedisTelemetryService } from './redis-telemetry.service';
import { EnergySettlementsService } from '../models/EnergySettlements/EnergySettlements.service';
import { SmartMetersService } from '../models/SmartMeters/SmartMeters.service';

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
   * Get energy statistics for a prosumer
   * Calculates today's and total generation/consumption from TimescaleDB
   */
  async getEnergyStats(prosumerId: string) {
    try {
      // Get prosumer's meters
      const devices = await this.smartMetersService.findAll({ prosumerId });
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
  async getEnergyChartData(prosumerId: string, days: number = 7) {
    try {
      // Get prosumer's meters
      const devices = await this.smartMetersService.findAll({ prosumerId });
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
   * Returns latest measurements from all smart meters
   */
  async getRealTimeEnergyData(prosumerId: string) {
    try {
      // Get prosumer's meters
      const devices = await this.smartMetersService.findAll({ prosumerId });
      const meterIds: string[] = devices.map(
        (d: { meterId: string }) => d.meterId,
      );

      if (meterIds.length === 0) {
        return { timeSeries: [], aggregated: this.getEmptyRealTimeData() };
      }

      // Get latest data from Redis for all meters
      const metersData = await Promise.all(
        meterIds.map(async (meterId) => {
          const meterData =
            await this.redisTelemetryService.getLatestData(meterId);
          return { meterId, data: meterData };
        }),
      );

      // Build time series data
      const timeSeries = metersData
        .filter((m) => m.data && m.data.data)
        .map((m) => {
          const meterData = m.data!; // Non-null assertion after filter
          const data = meterData.data;
          return {
            meterId: m.meterId,
            timestamp: meterData.datetime || new Date().toISOString(),
            solar: Number(data.solar_output?.power || 0) / 1000, // Convert W to kW
            consumption:
              (Number(data.load_smart_mtr?.power || 0) +
                Number(data.load_home?.power || 0)) /
              1000,
            battery: 0, // Battery power not directly available in current data structure
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

      // Calculate aggregated totals
      const aggregated = {
        totalSolar: timeSeries.reduce((sum, d) => sum + d.solar, 0),
        totalConsumption: timeSeries.reduce((sum, d) => sum + d.consumption, 0),
        totalBattery: timeSeries.reduce((sum, d) => sum + d.battery, 0),
        totalGridExport: timeSeries.reduce((sum, d) => sum + d.gridExport, 0),
        totalGridImport: timeSeries.reduce((sum, d) => sum + d.gridImport, 0),
        totalNetFlow: timeSeries.reduce((sum, d) => sum + d.netFlow, 0),
      };

      return {
        timeSeries,
        aggregated: {
          totalSolar: Math.round(aggregated.totalSolar * 100) / 100,
          totalConsumption: Math.round(aggregated.totalConsumption * 100) / 100,
          totalBattery: Math.round(aggregated.totalBattery * 100) / 100,
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
    prosumerId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    try {
      const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;

      const [stats, chartData, settlements] = await Promise.all([
        this.getEnergyStats(prosumerId),
        this.getEnergyChartData(prosumerId, days),
        this.getSettlementStats(prosumerId),
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
  async getSettlementStats(prosumerId: string) {
    try {
      // Get prosumer's meters
      const devices = await this.smartMetersService.findAll({ prosumerId });
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
    prosumerId: string,
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
      // Get prosumer's meters
      const devices = await this.smartMetersService.findAll({ prosumerId });
      let meterIds: string[] = devices.map(
        (d: { meterId: string }) => d.meterId,
      );

      if (meterId) {
        // Verify meter belongs to prosumer
        if (!meterIds.includes(meterId)) {
          this.logger.warn(
            `Meter ${meterId} does not belong to prosumer ${prosumerId}`,
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
      totalBattery: 0,
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
