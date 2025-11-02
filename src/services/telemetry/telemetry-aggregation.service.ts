import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RedisTelemetryService,
  TelemetrySnapshot,
} from './redis-telemetry.service';
import { TelemetryAggregate } from '../../models/telemetryAggregate/telemetryAggregate.entity';

/**
 * Service to aggregate real-time telemetry data from Redis into hourly PostgreSQL records
 * Runs every hour at the top of the hour (00 minutes)
 */
@Injectable()
export class TelemetryAggregationService {
  private readonly logger = new Logger(TelemetryAggregationService.name);

  constructor(
    @InjectRepository(TelemetryAggregate)
    private telemetryAggregateRepository: Repository<TelemetryAggregate>,
    private redisTelemetryService: RedisTelemetryService,
  ) {}

  /**
   * Cron job that runs every hour at the top of the hour (00 minutes)
   * Aggregates the previous hour's data
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'hourly-telemetry-aggregation',
  })
  async aggregateHourlyData() {
    this.logger.log('Starting hourly telemetry aggregation');

    try {
      // Get all meter IDs from latest status
      const allStatus = await this.redisTelemetryService.getAllLatestStatus();
      const meterIds = Object.keys(allStatus);

      if (meterIds.length === 0) {
        this.logger.warn('No meters found for aggregation');
        return;
      }

      // Define time range for previous hour
      const now = new Date();
      const hourStart = new Date(now);
      hourStart.setMinutes(0, 0, 0); // Reset to start of hour
      hourStart.setHours(hourStart.getHours() - 1); // Previous hour

      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourEnd.getHours() + 1); // Add 1 hour

      const startTimestamp = hourStart.getTime();
      const endTimestamp = hourEnd.getTime();

      this.logger.log(
        `Aggregating data for ${meterIds.length} meters from ${hourStart.toISOString()} to ${hourEnd.toISOString()}`,
      );

      // Process each meter
      const results = await Promise.allSettled(
        meterIds.map((meterId) =>
          this.aggregateMeterData(
            meterId,
            hourStart,
            startTimestamp,
            endTimestamp,
          ),
        ),
      );

      // Count successes and failures
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `Hourly aggregation completed: ${succeeded} succeeded, ${failed} failed`,
      );
    } catch (error) {
      this.logger.error('Error in hourly aggregation:', error);
    }
  }

  /**
   * Aggregate data for a single meter
   */
  private async aggregateMeterData(
    meterId: string,
    hourStart: Date,
    startTimestamp: number,
    endTimestamp: number,
  ): Promise<void> {
    try {
      // Get time-series snapshots from Redis
      const snapshots = await this.redisTelemetryService.getTimeSeriesSnapshots(
        meterId,
        startTimestamp,
        endTimestamp,
      );

      if (snapshots.length === 0) {
        this.logger.warn(
          `No snapshots found for meter ${meterId} in the specified time range`,
        );
        return;
      }

      // Calculate aggregates
      const aggregate = this.calculateAggregates(meterId, hourStart, snapshots);

      // Save to PostgreSQL
      await this.telemetryAggregateRepository.save(aggregate);

      // Cleanup old time-series data from Redis
      await this.redisTelemetryService.cleanupOldTimeSeries(
        meterId,
        endTimestamp,
      );

      this.logger.log(
        `Aggregated ${snapshots.length} snapshots for meter ${meterId}`,
      );
    } catch (error) {
      this.logger.error(`Error aggregating data for meter ${meterId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate statistical aggregates from snapshots
   */
  private calculateAggregates(
    meterId: string,
    hourStart: Date,
    snapshots: TelemetrySnapshot[],
  ): Partial<TelemetryAggregate> {
    const aggregate: Partial<TelemetryAggregate> = {
      meterId,
      hourStart,
      dataPointsCount: snapshots.length,
    };

    // Arrays to collect values for statistics
    const batteryVoltages: number[] = [];
    const batterySocs: number[] = [];
    const batteryChargeRates: number[] = [];
    const exportPowers: number[] = [];
    const importPowers: number[] = [];
    const loadSmartPowers: number[] = [];
    const loadHomePowers: number[] = [];
    const solarInputPowers: number[] = [];
    const solarOutputPowers: number[] = [];
    const netSolarPowers: number[] = [];
    const netGridPowers: number[] = [];
    const wifiRssis: number[] = [];
    const freeHeaps: number[] = [];

    let exportEnergyStart: number | null = null;
    let exportEnergyEnd: number | null = null;
    let importEnergyStart: number | null = null;
    let importEnergyEnd: number | null = null;
    let loadSmartEnergyStart: number | null = null;
    let loadSmartEnergyEnd: number | null = null;
    let loadHomeEnergyStart: number | null = null;
    let loadHomeEnergyEnd: number | null = null;
    let solarInputEnergyStart: number | null = null;
    let solarInputEnergyEnd: number | null = null;
    let solarOutputEnergyStart: number | null = null;
    let solarOutputEnergyEnd: number | null = null;

    let mqttDisconnections = 0;
    let lastMqttConnected = true;

    // Process each snapshot
    for (const snapshot of snapshots) {
      const meterData = snapshot.meterData; // Energy measurements
      const statusData = snapshot.statusData; // Device status (wifi, mqtt, system)

      if (meterData && meterData.data) {
        // Battery metrics
        if (meterData.data.battery) {
          batteryVoltages.push(meterData.data.battery.voltage);
          batterySocs.push(meterData.data.battery.soc);
          batteryChargeRates.push(meterData.data.battery.charge_rate);
        }

        // Export metrics
        if (meterData.data.export) {
          exportPowers.push(meterData.data.export.power);
          if (exportEnergyStart === null) {
            exportEnergyStart = meterData.data.export.total_energy;
          }
          exportEnergyEnd = meterData.data.export.total_energy;
        }

        // Import metrics
        if (meterData.data.import) {
          importPowers.push(meterData.data.import.power);
          if (importEnergyStart === null) {
            importEnergyStart = meterData.data.import.total_energy;
          }
          importEnergyEnd = meterData.data.import.total_energy;
        }

        // Load Smart Meter metrics
        if (meterData.data.load_smart_mtr) {
          loadSmartPowers.push(meterData.data.load_smart_mtr.power);
          if (loadSmartEnergyStart === null) {
            loadSmartEnergyStart = meterData.data.load_smart_mtr.total_energy;
          }
          loadSmartEnergyEnd = meterData.data.load_smart_mtr.total_energy;
        }

        // Load Home metrics
        if (meterData.data.load_home) {
          loadHomePowers.push(meterData.data.load_home.power);
          if (loadHomeEnergyStart === null) {
            loadHomeEnergyStart = meterData.data.load_home.total_energy;
          }
          loadHomeEnergyEnd = meterData.data.load_home.total_energy;
        }

        // Solar Input metrics
        if (meterData.data.solar_input) {
          solarInputPowers.push(meterData.data.solar_input.power);
          if (solarInputEnergyStart === null) {
            solarInputEnergyStart = meterData.data.solar_input.total_energy;
          }
          solarInputEnergyEnd = meterData.data.solar_input.total_energy;
        }

        // Solar Output metrics
        if (meterData.data.solar_output) {
          solarOutputPowers.push(meterData.data.solar_output.power);
          if (solarOutputEnergyStart === null) {
            solarOutputEnergyStart = meterData.data.solar_output.total_energy;
          }
          solarOutputEnergyEnd = meterData.data.solar_output.total_energy;
        }

        // Net calculations
        if (meterData.data.net_solar) {
          netSolarPowers.push(meterData.data.net_solar.net_power);
        }

        if (meterData.data.net_grid) {
          netGridPowers.push(meterData.data.net_grid.net_power);
        }
      }

      if (statusData && statusData.data) {
        // WiFi RSSI
        if (statusData.data.wifi && statusData.data.wifi.rssi) {
          wifiRssis.push(statusData.data.wifi.rssi);
        }

        // MQTT disconnections
        if (statusData.data.mqtt) {
          const currentConnected = statusData.data.mqtt.connected;
          if (lastMqttConnected && !currentConnected) {
            mqttDisconnections++;
          }
          lastMqttConnected = currentConnected;
        }

        // System free heap
        if (statusData.data.system && statusData.data.system.free_heap) {
          freeHeaps.push(statusData.data.system.free_heap);
        }
      }
    }

    // Calculate statistics
    aggregate.batteryVoltageAvg = this.avg(batteryVoltages);
    aggregate.batteryVoltageMin = this.min(batteryVoltages);
    aggregate.batteryVoltageMax = this.max(batteryVoltages);
    aggregate.batterySocAvg = this.avg(batterySocs);
    aggregate.batterySocMin = this.min(batterySocs);
    aggregate.batterySocMax = this.max(batterySocs);
    aggregate.batteryChargeRateAvg = this.avg(batteryChargeRates);

    aggregate.exportPowerAvg = this.avg(exportPowers);
    aggregate.exportPowerMax = this.max(exportPowers);
    aggregate.exportEnergyTotal =
      exportEnergyEnd !== null && exportEnergyStart !== null
        ? exportEnergyEnd - exportEnergyStart
        : null;

    aggregate.importPowerAvg = this.avg(importPowers);
    aggregate.importPowerMax = this.max(importPowers);
    aggregate.importEnergyTotal =
      importEnergyEnd !== null && importEnergyStart !== null
        ? importEnergyEnd - importEnergyStart
        : null;

    aggregate.loadSmartPowerAvg = this.avg(loadSmartPowers);
    aggregate.loadSmartPowerMax = this.max(loadSmartPowers);
    aggregate.loadSmartEnergyTotal =
      loadSmartEnergyEnd !== null && loadSmartEnergyStart !== null
        ? loadSmartEnergyEnd - loadSmartEnergyStart
        : null;

    aggregate.loadHomePowerAvg = this.avg(loadHomePowers);
    aggregate.loadHomePowerMax = this.max(loadHomePowers);
    aggregate.loadHomeEnergyTotal =
      loadHomeEnergyEnd !== null && loadHomeEnergyStart !== null
        ? loadHomeEnergyEnd - loadHomeEnergyStart
        : null;

    aggregate.solarInputPowerAvg = this.avg(solarInputPowers);
    aggregate.solarInputPowerMax = this.max(solarInputPowers);
    aggregate.solarInputEnergyTotal =
      solarInputEnergyEnd !== null && solarInputEnergyStart !== null
        ? solarInputEnergyEnd - solarInputEnergyStart
        : null;

    aggregate.solarOutputPowerAvg = this.avg(solarOutputPowers);
    aggregate.solarOutputPowerMax = this.max(solarOutputPowers);
    aggregate.solarOutputEnergyTotal =
      solarOutputEnergyEnd !== null && solarOutputEnergyStart !== null
        ? solarOutputEnergyEnd - solarOutputEnergyStart
        : null;

    aggregate.netSolarPowerAvg = this.avg(netSolarPowers);
    aggregate.netSolarEnergyTotal =
      aggregate.solarOutputEnergyTotal !== null &&
      aggregate.loadSmartEnergyTotal !== null
        ? aggregate.solarOutputEnergyTotal - aggregate.loadSmartEnergyTotal
        : null;

    aggregate.netGridPowerAvg = this.avg(netGridPowers);
    aggregate.netGridEnergyTotal =
      aggregate.exportEnergyTotal !== null &&
      aggregate.importEnergyTotal !== null
        ? aggregate.exportEnergyTotal - aggregate.importEnergyTotal
        : null;

    aggregate.wifiRssiAvg =
      wifiRssis.length > 0 ? Math.round(this.avg(wifiRssis)!) : null;
    aggregate.mqttDisconnections = mqttDisconnections;
    aggregate.freeHeapAvg =
      freeHeaps.length > 0 ? Math.round(this.avg(freeHeaps)!) : null;

    return aggregate;
  }

  // Helper functions for statistics
  private avg(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private min(values: number[]): number | null {
    if (values.length === 0) return null;
    return Math.min(...values);
  }

  private max(values: number[]): number | null {
    if (values.length === 0) return null;
    return Math.max(...values);
  }

  /**
   * Manual trigger for testing or recovery
   * Aggregates data for a specific time range
   */
  async manualAggregate(hourStart: Date): Promise<void> {
    this.logger.log(
      `Manual aggregation triggered for hour: ${hourStart.toISOString()}`,
    );

    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);

    const startTimestamp = hourStart.getTime();
    const endTimestamp = hourEnd.getTime();

    const allStatus = await this.redisTelemetryService.getAllLatestStatus();
    const meterIds = Object.keys(allStatus);

    await Promise.all(
      meterIds.map((meterId) =>
        this.aggregateMeterData(
          meterId,
          hourStart,
          startTimestamp,
          endTimestamp,
        ),
      ),
    );

    this.logger.log('Manual aggregation completed');
  }

  /**
   * Get hourly energy history for a user
   * @param userId Prosumer ID (not directly used, filtered by meterId)
   * @param hours Number of hours to retrieve
   * @param meterId Optional specific meter ID to filter
   */
  async getHourlyHistory(
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
    const hourStart = new Date();
    hourStart.setMinutes(0, 0, 0);
    hourStart.setHours(hourStart.getHours() - hours);

    const query = this.telemetryAggregateRepository
      .createQueryBuilder('ta')
      .where('ta.hourStart >= :hourStart', { hourStart })
      .orderBy('ta.hourStart', 'ASC');

    if (meterId) {
      query.andWhere('ta.meterId = :meterId', { meterId });
    }

    const aggregates = await query.getMany();

    return aggregates.map((agg) => ({
      hour: agg.hourStart.toISOString(),
      timestamp: agg.hourStart.toISOString(),
      solar: agg.solarInputEnergyTotal || 0,
      consumption:
        (agg.loadSmartEnergyTotal || 0) + (agg.loadHomeEnergyTotal || 0),
      battery: agg.netGridEnergyTotal || 0, // Net battery usage approximation
      gridExport: agg.exportEnergyTotal || 0,
      gridImport: agg.importEnergyTotal || 0,
      net: (agg.exportEnergyTotal || 0) - (agg.importEnergyTotal || 0),
    }));
  }
}
