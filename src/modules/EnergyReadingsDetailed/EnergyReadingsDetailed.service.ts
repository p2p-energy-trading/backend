import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnergyReadingsDetailed } from './entities/EnergyReadingsDetailed.entity';
import { CreateEnergyReadingsDetailedInput } from './dto/EnergyReadingsDetailed.input';
import { EnergyReadingsDetailedArgs } from './dto/EnergyReadingsDetailed.args';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';
import { GridSettlementData } from 'src/common/interfaces';

// Subsystem data interfaces for proper type safety
interface BatterySubsystemData {
  state?: string;
}

@Injectable()
export class EnergyReadingsDetailedService {
  private readonly Logger = new Logger(EnergyReadingsDetailedService.name);

  constructor(
    @InjectRepository(EnergyReadingsDetailed)
    private readonly repo: Repository<EnergyReadingsDetailed>,
    @InjectRepository(SmartMeters)
    private readonly SmartMetersRepo: Repository<SmartMeters>,
  ) {}

  // just a simple example of a method that finds the latest reading for a given meterId, no relation, take 2
  async findLatestGridImportAndExportByMeterId(
    meterId: string,
  ): Promise<GridSettlementData | null> {
    const latestReadingImport = await this.repo
      .createQueryBuilder('reading')
      .where('reading.meterId = :meterId', { meterId })
      .andWhere('(reading.subsystem = :import)', {
        import: 'GRID_IMPORT',
      })
      .orderBy('reading.timestamp', 'DESC')
      .getOne();

    const latestReadingExport = await this.repo
      .createQueryBuilder('reading')
      .where('reading.meterId = :meterId', { meterId })
      .andWhere('(reading.subsystem = :export)', {
        export: 'GRID_EXPORT',
      })
      .orderBy('reading.timestamp', 'DESC')
      .getOne();

    const settlementData: GridSettlementData = {
      meterId: latestReadingImport?.meterId || '',
      timestamp: latestReadingImport?.timestamp.toISOString() || '',
      importEnergyWh:
        latestReadingImport?.subsystem === 'GRID_IMPORT'
          ? latestReadingImport.settlementEnergyWh || 0
          : 0,
      exportEnergyWh:
        latestReadingExport?.subsystem === 'GRID_EXPORT'
          ? latestReadingExport.settlementEnergyWh || 0
          : 0,
    };

    return settlementData || null;
  }

  /**
   * Find energy readings with flexible filtering options.
   *
   * @param args - Filtering arguments including:
   *   - meterId: Filter by specific meter ID
   *   - timestamp: Exact timestamp match
   *   - timestampFrom: Start of time range (inclusive)
   *   - timestampTo: End of time range (inclusive)
   *   - lastHours: Get readings from the last N hours (e.g., 1 for last hour, 24 for last day)
   *   - subsystem: Filter by subsystem type
   *   - Various energy and power filters
   *
   * @returns Array of energy readings ordered by timestamp (latest first)
   *
   * @example
   * // Get readings from last hour for a specific meter (for dashboard real-time data)
   * findAll({ meterId: 'METER_001', lastHours: 1 })
   *
   * // Get readings for a specific date range
   * findAll({ meterId: 'METER_001', timestampFrom: '2024-01-01T00:00:00Z', timestampTo: '2024-01-01T23:59:59Z' })
   *
   * // Get all readings for a meter
   * findAll({ meterId: 'METER_001' })
   */
  async findAll(
    args?: EnergyReadingsDetailedArgs,
  ): Promise<EnergyReadingsDetailed[]> {
    const queryBuilder = this.repo.createQueryBuilder('reading');

    // Apply filters based on args
    if (args && args.readingId !== undefined) {
      queryBuilder.andWhere('reading.readingId = :readingId', {
        readingId: args.readingId,
      });
    }
    if (args && args.meterId !== undefined) {
      queryBuilder.andWhere('reading.meterId = :meterId', {
        meterId: args.meterId,
      });
    }
    if (args && args.timestamp !== undefined) {
      queryBuilder.andWhere('reading.timestamp = :timestamp', {
        timestamp: args.timestamp,
      });
    }

    // Time range filtering for dashboard real-time data
    if (args && args.timestampFrom !== undefined) {
      queryBuilder.andWhere('reading.timestamp >= :timestampFrom', {
        timestampFrom: new Date(args.timestampFrom),
      });
    }
    if (args && args.timestampTo !== undefined) {
      queryBuilder.andWhere('reading.timestamp <= :timestampTo', {
        timestampTo: new Date(args.timestampTo),
      });
    }

    // Hours-based filtering (e.g., last 1 hour, last 24 hours)
    if (args && args.lastHours !== undefined && args.lastHours > 0) {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - args.lastHours);
      queryBuilder.andWhere('reading.timestamp >= :cutoffTime', {
        cutoffTime,
      });
    }

    if (args && args.subsystem !== undefined) {
      queryBuilder.andWhere('reading.subsystem = :subsystem', {
        subsystem: args.subsystem,
      });
    }
    if (args && args.dailyEnergyWh !== undefined) {
      queryBuilder.andWhere('reading.dailyEnergyWh = :dailyEnergyWh', {
        dailyEnergyWh: args.dailyEnergyWh,
      });
    }
    if (args && args.totalEnergyWh !== undefined) {
      queryBuilder.andWhere('reading.totalEnergyWh = :totalEnergyWh', {
        totalEnergyWh: args.totalEnergyWh,
      });
    }
    if (args && args.settlementEnergyWh !== undefined) {
      queryBuilder.andWhere(
        'reading.settlementEnergyWh = :settlementEnergyWh',
        {
          settlementEnergyWh: args.settlementEnergyWh,
        },
      );
    }
    if (args && args.currentPowerW !== undefined) {
      queryBuilder.andWhere('reading.currentPowerW = :currentPowerW', {
        currentPowerW: args.currentPowerW,
      });
    }
    if (args && args.voltage !== undefined) {
      queryBuilder.andWhere('reading.voltage = :voltage', {
        voltage: args.voltage,
      });
    }
    if (args && args.currentAmp !== undefined) {
      queryBuilder.andWhere('reading.currentAmp = :currentAmp', {
        currentAmp: args.currentAmp,
      });
    }

    // Order by timestamp descending for latest readings first
    queryBuilder.orderBy('reading.timestamp', 'DESC');

    return queryBuilder.getMany();
  }

  async findRecentByMeterId(
    meterId: string,
    hours: number = 1,
  ): Promise<EnergyReadingsDetailed[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    return this.repo
      .createQueryBuilder('reading')
      .where('reading.meterId = :meterId', { meterId })
      .andWhere('reading.timestamp >= :cutoffTime', { cutoffTime })
      .orderBy('reading.timestamp', 'DESC')
      .getMany();
  }

  async findLatestByMeterId(
    meterId: string,
  ): Promise<EnergyReadingsDetailed[]> {
    return this.repo
      .createQueryBuilder('reading')
      .where('reading.meterId = :meterId', { meterId })
      .orderBy('reading.timestamp', 'DESC')
      .limit(10) // Get last 10 readings for complete subsystem data
      .getMany();
  }

  async findLatestByMeterIdAndSubsystem(
    meterId: string,
    subsystem: string,
  ): Promise<EnergyReadingsDetailed | null> {
    return this.repo
      .createQueryBuilder('reading')
      .where('reading.meterId = :meterId', { meterId })
      .andWhere('reading.subsystem = :subsystem', { subsystem })
      .orderBy('reading.timestamp', 'DESC')
      .getOne();
  }

  async findByDateRange(
    meterId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<EnergyReadingsDetailed[]> {
    return this.repo
      .createQueryBuilder('reading')
      .where('reading.meterId = :meterId', { meterId })
      .andWhere('reading.timestamp >= :startDate', { startDate })
      .andWhere('reading.timestamp <= :endDate', { endDate })
      .orderBy('reading.timestamp', 'ASC')
      .getMany();
  }

  async findDailyAggregatedData(
    meterId: string,
    date: Date,
  ): Promise<
    {
      subsystem: string;
      totalDailyEnergyWh: number;
      avgPowerW: number;
      maxPowerW: number;
      readingCount: number;
    }[]
  > {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    interface RawQueryResult {
      subsystem: string;
      totalDailyEnergyWh: string;
      avgPowerW: string;
      maxPowerW: string;
      readingCount: string;
    }

    const result = await this.repo
      .createQueryBuilder('reading')
      .select('reading.subsystem', 'subsystem')
      .addSelect('MAX(reading.dailyEnergyWh)', 'totalDailyEnergyWh')
      .addSelect('AVG(reading.currentPowerW)', 'avgPowerW')
      .addSelect('MAX(reading.currentPowerW)', 'maxPowerW')
      .addSelect('COUNT(*)', 'readingCount')
      .where('reading.meterId = :meterId', { meterId })
      .andWhere('reading.timestamp >= :startOfDay', { startOfDay })
      .andWhere('reading.timestamp <= :endOfDay', { endOfDay })
      .groupBy('reading.subsystem')
      .getRawMany<RawQueryResult>();

    return result.map((row) => ({
      subsystem: row.subsystem,
      totalDailyEnergyWh: parseFloat(row.totalDailyEnergyWh) || 0,
      avgPowerW: parseFloat(row.avgPowerW) || 0,
      maxPowerW: parseFloat(row.maxPowerW) || 0,
      readingCount: parseInt(row.readingCount) || 0,
    }));
  }

  async findOne(readingId: number): Promise<EnergyReadingsDetailed> {
    const entity = await this.repo.findOne({ where: { readingId } });
    if (!entity) {
      throw new Error(
        `EnergyReadingsDetailed with readingId ${'$'}{readingId} not found`,
      );
    }
    return entity;
  }

  async create(
    input: CreateEnergyReadingsDetailedInput,
  ): Promise<EnergyReadingsDetailed> {
    // Convert input types to match entity types
    const createData: Partial<EnergyReadingsDetailed> = {
      meterId: input.meterId,
      subsystem: input.subsystem,
      dailyEnergyWh: input.dailyEnergyWh ?? undefined,
      totalEnergyWh: input.totalEnergyWh ?? undefined,
      settlementEnergyWh: input.settlementEnergyWh ?? undefined,
      currentPowerW: input.currentPowerW ?? undefined,
      voltage: input.voltage ?? undefined,
      currentAmp: input.currentAmp ?? undefined,
      subsystemData: input.subsystemData ?? undefined,
      rawPayload: input.rawPayload,
      timestamp: input.timestamp ? new Date(input.timestamp) : new Date(), // Default to current date if not provided
    };

    const entity = this.repo.create(createData);
    const savedEntity = await this.repo.save(entity);
    return this.findOne(savedEntity.readingId);
  }

  async update(
    readingId: number,
    input: CreateEnergyReadingsDetailedInput,
  ): Promise<EnergyReadingsDetailed> {
    const existing = await this.findOne(readingId);

    // Convert input types to match entity types
    const updateData: Partial<EnergyReadingsDetailed> = {
      meterId: input.meterId,
      subsystem: input.subsystem,
      dailyEnergyWh: input.dailyEnergyWh ?? undefined,
      totalEnergyWh: input.totalEnergyWh ?? undefined,
      settlementEnergyWh: input.settlementEnergyWh ?? undefined,
      currentPowerW: input.currentPowerW ?? undefined,
      voltage: input.voltage ?? undefined,
      currentAmp: input.currentAmp ?? undefined,
      subsystemData: input.subsystemData ?? undefined,
      rawPayload: input.rawPayload,
      timestamp: input.timestamp
        ? new Date(input.timestamp)
        : existing.timestamp, // Use existing timestamp if not provided
    };

    await this.repo.save({ ...existing, ...updateData });
    return this.findOne(readingId);
  }

  async remove(readingId: number): Promise<boolean> {
    const result = await this.repo.delete({ readingId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Get the latest complete sensor reading set (all 5 subsystems) for a meter.
   * Each MQTT message creates 5 rows with the same timestamp for different subsystems.
   *
   * @param meterId - The meter ID to get readings for
   * @returns Array of 5 readings (SOLAR, LOAD, BATTERY, GRID_EXPORT, GRID_IMPORT) from the latest timestamp
   */
  async findLatestCompleteSet(
    meterId: string,
  ): Promise<EnergyReadingsDetailed[]> {
    // First get the latest timestamp for this meter
    const latestReading = await this.repo
      .createQueryBuilder('reading')
      .where('reading.meterId = :meterId', { meterId })
      .orderBy('reading.timestamp', 'DESC')
      .getOne();

    if (!latestReading) {
      return [];
    }

    // Get all readings with the same timestamp (should be 5 subsystems)
    return this.repo
      .createQueryBuilder('reading')
      .where('reading.meterId = :meterId', { meterId })
      .andWhere('reading.timestamp = :timestamp', {
        timestamp: latestReading.timestamp,
      })
      .orderBy('reading.subsystem', 'ASC')
      .getMany();
  }

  /**
   * Get the latest complete set of readings for multiple meters efficiently.
   * Uses a single query with window functions to avoid N+1 queries.
   *
   * @param meterIds - Array of meter IDs to get readings for
   * @returns Map of meterId to latest complete set of readings
   */
  async findLatestCompleteSetsForMeters(
    meterIds: string[],
  ): Promise<Map<string, EnergyReadingsDetailed[]>> {
    if (meterIds.length === 0) {
      return new Map();
    }

    // Use raw SQL with window functions for maximum efficiency
    const rawQuery = `
      WITH latest_timestamps AS (
        SELECT 
          "meter_id",
          MAX(timestamp) as latest_timestamp
        FROM energy_readings_detailed 
        WHERE "meter_id" = ANY($1)
        GROUP BY "meter_id"
      )
      SELECT 
        r."reading_id" as "readingId",
        r."meter_id" as "meterId",
        r.timestamp,
        r.subsystem,
        r."current_power_w" as "currentPowerW",
        r."settlement_energy_wh" as "settlementEnergyWh"
      FROM energy_readings_detailed r
      INNER JOIN latest_timestamps lt ON r."meter_id" = lt."meter_id" AND r.timestamp = lt.latest_timestamp
      WHERE r.subsystem IN ('SOLAR', 'LOAD', 'BATTERY', 'GRID_EXPORT', 'GRID_IMPORT')
      ORDER BY r."meter_id", r.subsystem;
    `;

    interface RawReadingResult {
      readingId: number;
      meterId: string;
      timestamp: Date;
      subsystem: string;
      currentPowerW: number;
      settlementEnergyWh: number;
    }

    const results: RawReadingResult[] = await this.repo.query(rawQuery, [
      meterIds,
    ]);

    // Group results by meterId
    const meterReadingsMap = new Map<string, EnergyReadingsDetailed[]>();

    for (const row of results) {
      const meterId = row.meterId;

      if (!meterReadingsMap.has(meterId)) {
        meterReadingsMap.set(meterId, []);
      }

      // Create EnergyReadingsDetailed entity-like object
      const reading = this.repo.create({
        readingId: row.readingId,
        meterId: row.meterId,
        timestamp: row.timestamp,
        subsystem: row.subsystem,
        currentPowerW: row.currentPowerW,
        settlementEnergyWh: row.settlementEnergyWh,
      });

      meterReadingsMap.get(meterId)!.push(reading);
    }

    return meterReadingsMap;
  }

  /**
   * Get time series data for multiple meters with a single optimized query.
   * Uses window functions to get the latest N complete sets per meter.
   *
   * @param meterIds - Array of meter IDs
   * @param dataPointsPerMeter - Number of data points per meter
   * @returns Map of meterId to time series data
   */
  async findTimeSeriesForMultipleMeters(
    meterIds: string[],
    dataPointsPerMeter: number = 10,
  ): Promise<
    Map<
      string,
      Array<{
        timestamp: string;
        solar: number;
        load: number;
        battery: number;
        gridExport: number;
        gridImport: number;
      }>
    >
  > {
    if (meterIds.length === 0) {
      return new Map();
    }

    // Raw SQL with window functions for optimal performance
    const rawQuery = `
      WITH ranked_readings AS (
        SELECT 
          "meter_id" as "meterId",
          timestamp,
          subsystem,
          "current_power_w" as "currentPowerW",
          ROW_NUMBER() OVER (
            PARTITION BY "meter_id", timestamp 
            ORDER BY "reading_id"
          ) as rn_per_timestamp,
          DENSE_RANK() OVER (
            PARTITION BY "meter_id" 
            ORDER BY timestamp DESC
          ) as timestamp_rank
        FROM energy_readings_detailed 
        WHERE "meter_id" = ANY($1)
          AND subsystem IN ('SOLAR', 'LOAD', 'BATTERY', 'GRID_EXPORT', 'GRID_IMPORT')
      )
      SELECT 
        "meterId",
        timestamp,
        subsystem,
        "currentPowerW"
      FROM ranked_readings 
      WHERE timestamp_rank <= $2
        AND rn_per_timestamp = 1
      ORDER BY "meterId", timestamp DESC, subsystem;
    `;

    interface RawTimeSeriesResult {
      meterId: string;
      timestamp: Date;
      subsystem: string;
      currentPowerW: number;
    }

    const results: RawTimeSeriesResult[] = await this.repo.query(rawQuery, [
      meterIds,
      dataPointsPerMeter,
    ]);

    // Group and organize data by meter and timestamp
    const meterTimeSeriesMap = new Map<
      string,
      Map<
        string,
        {
          timestamp: string;
          solar: number;
          load: number;
          battery: number;
          gridExport: number;
          gridImport: number;
        }
      >
    >();

    for (const row of results) {
      const meterId = row.meterId;
      const timestamp = new Date(row.timestamp).toISOString();

      if (!meterTimeSeriesMap.has(meterId)) {
        meterTimeSeriesMap.set(meterId, new Map());
      }

      const meterData = meterTimeSeriesMap.get(meterId)!;

      if (!meterData.has(timestamp)) {
        meterData.set(timestamp, {
          timestamp,
          solar: 0,
          load: 0,
          battery: 0,
          gridExport: 0,
          gridImport: 0,
        });
      }

      const timestampData = meterData.get(timestamp)!;
      const powerW = row.currentPowerW || 0;

      switch (row.subsystem) {
        case 'SOLAR':
          timestampData.solar = powerW;
          break;
        case 'LOAD':
          timestampData.load = powerW;
          break;
        case 'BATTERY':
          timestampData.battery = powerW;
          break;
        case 'GRID_EXPORT':
          timestampData.gridExport = powerW;
          break;
        case 'GRID_IMPORT':
          timestampData.gridImport = powerW;
          break;
      }
    }

    // Convert to final format
    const finalResult = new Map<
      string,
      Array<{
        timestamp: string;
        solar: number;
        load: number;
        battery: number;
        gridExport: number;
        gridImport: number;
      }>
    >();

    for (const [meterId, timestampMap] of meterTimeSeriesMap) {
      const timeSeriesArray = Array.from(timestampMap.values())
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, dataPointsPerMeter);

      finalResult.set(meterId, timeSeriesArray);
    }

    return finalResult;
  }

  /**
   * Optimized method to get time series power data with minimal database queries.
   * Uses a single query to get the latest N timestamps with their power data.
   *
   * @param meterId - The meter ID to get readings for
   * @param dataPoints - Number of data points to retrieve (default: 20)
   * @returns Array of time series data optimized for real-time dashboard
   */
  async findTimeSeriesPowerDataOptimized(
    meterId: string,
    dataPoints: number = 20,
  ): Promise<
    Array<{
      timestamp: string;
      solar: number;
      load: number;
      battery: number;
      gridExport: number;
      gridImport: number;
    }>
  > {
    // Single optimized query to get the latest complete data sets
    const rawResults = await this.repo
      .createQueryBuilder('reading')
      .select([
        'reading.timestamp',
        'reading.subsystem',
        'reading.currentPowerW',
        'reading.subsystemData',
      ])
      .where('reading.meterId = :meterId', { meterId })
      .andWhere('reading.subsystem IN (:...subsystems)', {
        subsystems: ['SOLAR', 'LOAD', 'BATTERY', 'GRID_EXPORT', 'GRID_IMPORT'],
      })
      .orderBy('reading.timestamp', 'DESC')
      .addOrderBy('reading.subsystem', 'ASC')
      .limit(dataPoints * 5) // Limit to dataPoints * 5 subsystems
      .getMany();

    if (rawResults.length === 0) {
      return [];
    }

    // Group by timestamp and build time series
    const timestampMap = new Map<
      string,
      {
        solar: number;
        load: number;
        battery: number;
        gridExport: number;
        gridImport: number;
      }
    >();

    for (const result of rawResults) {
      const timestampKey = result.timestamp.toISOString();

      if (!timestampMap.has(timestampKey)) {
        timestampMap.set(timestampKey, {
          solar: 0,
          load: 0,
          battery: 0,
          gridExport: 0,
          gridImport: 0,
        });
      }

      const powerData = timestampMap.get(timestampKey)!;
      const powerW = result.currentPowerW || 0;

      switch (result.subsystem) {
        case 'SOLAR': {
          powerData.solar = powerW; // Only count power if actively generating
          break;
        }
        case 'LOAD': {
          powerData.load = powerW;
          break;
        }
        case 'BATTERY': {
          // Extract complete subsystem data structure
          const batteryData =
            result.subsystemData as BatterySubsystemData | null;

          const chargeState = batteryData?.state || 'unknown';

          // Determine power direction based on charge state
          const isCharging = chargeState === 'charging';

          // Use charge state to determine power direction (positive for charging, negative for discharging)
          powerData.battery = isCharging ? powerW : -powerW;
          break;
        }
        case 'GRID_EXPORT': {
          powerData.gridExport = powerW;
          break;
        }
        case 'GRID_IMPORT': {
          powerData.gridImport = powerW;
          break;
        }
      }
    }

    // Convert to array and sort by timestamp (newest first)
    const timeSeriesData = Array.from(timestampMap.entries())
      .map(([timestamp, powerData]) => ({
        timestamp,
        ...powerData,
      }))
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, dataPoints); // Final limit to exact dataPoints

    return timeSeriesData;
  }

  /**
   * Get the latest reading per subsystem per day per meter for chart data.
   * This ensures accurate daily energy totals by avoiding double-counting since
   * dailyEnergyWh is already cumulative for the day.
   *
   * @param meterIds - Array of meter IDs
   * @param startDate - Start date for the chart period
   * @param endDate - End date for the chart period
   * @returns Map of date -> meterId -> subsystem -> dailyEnergyWh
   */
  /**
   * OPTIMIZED: Get the latest reading per subsystem per day per meter for chart data.
   * This version pre-aggregates data at the database level for maximum performance.
   *
   * @param meterIds - Array of meter IDs
   * @param startDate - Start date for the chart period
   * @param endDate - End date for the chart period
   * @returns Map of date -> meterId -> subsystem -> dailyEnergyWh
   */
  async findLatestDailyReadingsForChart(
    meterIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Map<string, Map<string, Map<string, number>>>> {
    if (meterIds.length === 0) {
      return new Map();
    }

    // OPTIMIZED: More efficient query with pre-aggregation and reduced data transfer
    const rawQuery = `
      WITH daily_latest AS (
        SELECT DISTINCT ON (DATE("timestamp"), "meter_id", subsystem)
          DATE("timestamp") as reading_date,
          "meter_id",
          subsystem,
          "daily_energy_wh"
        FROM energy_readings_detailed 
        WHERE "meter_id" = ANY($1)
          AND "timestamp" >= $2::timestamptz
          AND "timestamp" < $3::timestamptz
          AND subsystem IN ('SOLAR', 'LOAD', 'GRID_EXPORT', 'GRID_IMPORT')
          AND "daily_energy_wh" IS NOT NULL
          AND "daily_energy_wh" > 0
        ORDER BY DATE("timestamp"), "meter_id", subsystem, "timestamp" DESC
      ),
      aggregated_by_date AS (
        SELECT 
          reading_date,
          SUM(CASE WHEN subsystem = 'SOLAR' THEN "daily_energy_wh" ELSE 0 END) as total_generation,
          SUM(CASE WHEN subsystem = 'LOAD' THEN "daily_energy_wh" ELSE 0 END) as total_consumption,
          SUM(CASE WHEN subsystem = 'GRID_EXPORT' THEN "daily_energy_wh" ELSE 0 END) as total_grid_export,
          SUM(CASE WHEN subsystem = 'GRID_IMPORT' THEN "daily_energy_wh" ELSE 0 END) as total_grid_import,
          jsonb_object_agg(
            "meter_id", 
            jsonb_build_object(
              'SOLAR', COALESCE(SUM(CASE WHEN subsystem = 'SOLAR' THEN "daily_energy_wh" END), 0),
              'LOAD', COALESCE(SUM(CASE WHEN subsystem = 'LOAD' THEN "daily_energy_wh" END), 0),
              'GRID_EXPORT', COALESCE(SUM(CASE WHEN subsystem = 'GRID_EXPORT' THEN "daily_energy_wh" END), 0),
              'GRID_IMPORT', COALESCE(SUM(CASE WHEN subsystem = 'GRID_IMPORT' THEN "daily_energy_wh" END), 0)
            )
          ) as meter_data
        FROM daily_latest
        GROUP BY reading_date
      )
      SELECT 
        reading_date,
        total_generation,
        total_consumption,
        total_grid_export,
        total_grid_import,
        meter_data
      FROM aggregated_by_date
      ORDER BY reading_date;
    `;

    interface OptimizedChartResult {
      reading_date: string;
      total_generation: string;
      total_consumption: string;
      total_grid_export: string;
      total_grid_import: string;
      meter_data: any;
    }

    const results: OptimizedChartResult[] = await this.repo.query(rawQuery, [
      meterIds,
      startDate.toISOString(),
      endDate.toISOString(),
    ]);

    // Process the optimized results
    const chartDataMap = new Map<string, Map<string, Map<string, number>>>();

    for (const row of results) {
      const dateStr = row.reading_date;
      const meterData = row.meter_data || {};

      if (!chartDataMap.has(dateStr)) {
        chartDataMap.set(dateStr, new Map());
      }

      const dateMap = chartDataMap.get(dateStr)!;

      // Process each meter's data from the pre-aggregated JSON
      for (const [meterId, subsystemData] of Object.entries(meterData)) {
        if (!dateMap.has(meterId)) {
          dateMap.set(meterId, new Map());
        }

        const meterMap = dateMap.get(meterId)!;
        const data = subsystemData as any;

        // Set subsystem values
        meterMap.set('SOLAR', Number(data.SOLAR) || 0);
        meterMap.set('LOAD', Number(data.LOAD) || 0);
        meterMap.set('GRID_EXPORT', Number(data.GRID_EXPORT) || 0);
        meterMap.set('GRID_IMPORT', Number(data.GRID_IMPORT) || 0);
      }
    }

    return chartDataMap;
  }

  /**
   * ALTERNATIVE: Ultra-fast simplified chart query for basic chart needs.
   * Returns pre-calculated totals per day, reducing frontend processing.
   */
  async findDailyEnergyTotalsForChart(
    meterIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      date: string;
      generation: number;
      consumption: number;
      gridExport: number;
      gridImport: number;
      net: number;
    }>
  > {
    if (meterIds.length === 0) {
      return [];
    }

    // Ultra-optimized query that returns chart-ready data
    const rawQuery = `
      WITH daily_latest AS (
        SELECT DISTINCT ON (DATE("timestamp"), "meter_id", subsystem)
          DATE("timestamp") as reading_date,
          subsystem,
          "daily_energy_wh"
        FROM energy_readings_detailed 
        WHERE "meter_id" = ANY($1)
          AND "timestamp" >= $2::timestamptz
          AND "timestamp" < $3::timestamptz
          AND subsystem IN ('SOLAR', 'LOAD', 'GRID_EXPORT', 'GRID_IMPORT')
          AND "daily_energy_wh" IS NOT NULL
          AND "daily_energy_wh" > 0
        ORDER BY DATE("timestamp"), "meter_id", subsystem, "timestamp" DESC
      )
      SELECT 
        reading_date as date,
        ROUND(SUM(CASE WHEN subsystem = 'SOLAR' THEN "daily_energy_wh" ELSE 0 END) / 1000.0, 3) as generation,
        ROUND(SUM(CASE WHEN subsystem = 'LOAD' THEN "daily_energy_wh" ELSE 0 END) / 1000.0, 3) as consumption,
        ROUND(SUM(CASE WHEN subsystem = 'GRID_EXPORT' THEN "daily_energy_wh" ELSE 0 END) / 1000.0, 3) as grid_export,
        ROUND(SUM(CASE WHEN subsystem = 'GRID_IMPORT' THEN "daily_energy_wh" ELSE 0 END) / 1000.0, 3) as grid_import,
        ROUND((
          SUM(CASE WHEN subsystem = 'SOLAR' THEN "daily_energy_wh" ELSE 0 END) -
          SUM(CASE WHEN subsystem = 'LOAD' THEN "daily_energy_wh" ELSE 0 END)
        ) / 1000.0, 3) as net
      FROM daily_latest
      GROUP BY reading_date
      ORDER BY reading_date;
    `;

    interface SimplifiedChartResult {
      date: string;
      generation: string;
      consumption: string;
      grid_export: string;
      grid_import: string;
      net: string;
    }

    const results: SimplifiedChartResult[] = await this.repo.query(rawQuery, [
      meterIds,
      startDate.toISOString(),
      endDate.toISOString(),
    ]);

    return results.map((row) => ({
      date: row.date,
      generation: parseFloat(row.generation) || 0,
      consumption: parseFloat(row.consumption) || 0,
      gridExport: parseFloat(row.grid_export) || 0,
      gridImport: parseFloat(row.grid_import) || 0,
      net: parseFloat(row.net) || 0,
    }));
  }

  /**
   * Get optimized energy statistics for dashboard using latest readings only.
   * Since MQTT data is cumulative, we only need the latest reading per subsystem for today.
   * For historical totals, we sum the latest daily_energy_wh from each day across all history.
   *
   * @param meterIds - Array of meter IDs
   * @returns Object with today and total energy statistics
   *
   * Logic:
   * - Today stats: Latest daily_energy_wh per meter per subsystem for today
   * - Total stats: Sum of latest daily_energy_wh from each day for each subsystem across all history
   *   (e.g., if there are 40 days of data, sum the latest reading from each of those 40 days)
   */
  async findLatestEnergyStatsForDashboard(meterIds: string[]): Promise<{
    todayStats: {
      generation: number;
      consumption: number;
      gridExport: number;
      gridImport: number;
    };
    totalStats: {
      generation: number;
      consumption: number;
      gridExport: number;
      gridImport: number;
    };
  }> {
    if (meterIds.length === 0) {
      return {
        todayStats: {
          generation: 0,
          consumption: 0,
          gridExport: 0,
          gridImport: 0,
        },
        totalStats: {
          generation: 0,
          consumption: 0,
          gridExport: 0,
          gridImport: 0,
        },
      };
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Use raw SQL for maximum performance - get latest reading per meter per subsystem for today and historical totals
    const rawQuery = `
      WITH latest_today AS (
        -- Get latest reading per meter per subsystem for today
        SELECT DISTINCT ON ("meter_id", subsystem)
          "meter_id",
          subsystem,
          "daily_energy_wh"
        FROM energy_readings_detailed 
        WHERE "meter_id" = ANY($1)
          AND "timestamp" >= $2
          AND "timestamp" < $3
          AND subsystem IN ('SOLAR', 'LOAD', 'GRID_EXPORT', 'GRID_IMPORT')
          AND "daily_energy_wh" IS NOT NULL
        ORDER BY "meter_id", subsystem, "timestamp" DESC
      ),
      daily_totals_historical AS (
        -- Get latest reading per meter per subsystem per day for all history
        SELECT DISTINCT ON (DATE("timestamp"), "meter_id", subsystem)
          DATE("timestamp") as reading_date,
          "meter_id",
          subsystem,
          "daily_energy_wh"
        FROM energy_readings_detailed 
        WHERE "meter_id" = ANY($1)
          AND subsystem IN ('SOLAR', 'LOAD', 'GRID_EXPORT', 'GRID_IMPORT')
          AND "daily_energy_wh" IS NOT NULL
          AND "daily_energy_wh" > 0
        ORDER BY DATE("timestamp"), "meter_id", subsystem, "timestamp" DESC
      ),
      today_aggregated AS (
        SELECT 
          subsystem,
          SUM("daily_energy_wh") as total_daily_energy_wh
        FROM latest_today
        GROUP BY subsystem
      ),
      total_aggregated AS (
        -- Sum all daily totals from history across all days and meters
        SELECT 
          subsystem,
          SUM("daily_energy_wh") as total_energy_wh
        FROM daily_totals_historical
        GROUP BY subsystem
      )
      SELECT 
        'today' as period,
        subsystem,
        total_daily_energy_wh as energy_wh,
        0 as total_energy_wh
      FROM today_aggregated
      UNION ALL
      SELECT 
        'total' as period,
        subsystem,
        0 as energy_wh,
        total_energy_wh
      FROM total_aggregated
      ORDER BY period, subsystem;
    `;

    interface EnergyStatsResult {
      period: 'today' | 'total';
      subsystem: string;
      energy_wh: number;
      total_energy_wh: number;
    }

    const results: EnergyStatsResult[] = await this.repo.query(rawQuery, [
      meterIds,
      today.toISOString(),
      tomorrow.toISOString(),
    ]);

    // Initialize stats
    const todayStats = {
      generation: 0,
      consumption: 0,
      gridExport: 0,
      gridImport: 0,
    };
    const totalStats = {
      generation: 0,
      consumption: 0,
      gridExport: 0,
      gridImport: 0,
    };

    // Process results
    for (const row of results) {
      const energyWh =
        row.period === 'today' ? row.energy_wh : row.total_energy_wh;
      const stats = row.period === 'today' ? todayStats : totalStats;

      switch (row.subsystem) {
        case 'SOLAR':
          stats.generation += energyWh || 0;
          break;
        case 'LOAD':
          stats.consumption += energyWh || 0;
          break;
        case 'GRID_EXPORT':
          stats.gridExport += energyWh || 0;
          break;
        case 'GRID_IMPORT':
          stats.gridImport += energyWh || 0;
          break;
      }
    }

    // Convert Wh to kWh
    todayStats.generation /= 1000;
    todayStats.consumption /= 1000;
    todayStats.gridExport /= 1000;
    todayStats.gridImport /= 1000;

    totalStats.generation /= 1000;
    totalStats.consumption /= 1000;
    totalStats.gridExport /= 1000;
    totalStats.gridImport /= 1000;

    return { todayStats, totalStats };
  }

  /**
   * Get optimized device status statistics for dashboard using aggregated queries.
   *
   * @param meterIds - Array of meter IDs
   * @returns Object with device status statistics
   */
  async findDeviceStatusStatsForDashboard(meterIds: string[]): Promise<{
    totalDevices: number;
    onlineDevices: number;
    lastHeartbeat: string | null;
    settlementsToday: number;
  }> {
    if (meterIds.length === 0) {
      return {
        totalDevices: 0,
        onlineDevices: 0,
        lastHeartbeat: null,
        settlementsToday: 0,
      };
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Use raw SQL for optimal performance
    const deviceStatsQuery = `
      SELECT 
        COUNT(*) as total_devices,
        COUNT(CASE WHEN last_heartbeat_at > NOW() - INTERVAL '5 minutes' THEN 1 END) as online_devices,
        MAX(last_heartbeat_at) as latest_heartbeat
      FROM smart_meters 
      WHERE meter_id = ANY($1);
    `;

    const settlementStatsQuery = `
      SELECT 
        COUNT(*) as settlements_today
      FROM energy_settlements 
      WHERE meter_id = ANY($1)
        AND created_at_backend >= $2
        AND created_at_backend < $3;
    `;

    interface DeviceStatsResult {
      total_devices: string;
      online_devices: string;
      latest_heartbeat: string | null;
    }

    interface SettlementCountResult {
      settlements_today: string;
    }

    const [deviceResults, settlementResults] = await Promise.all([
      this.repo.query(deviceStatsQuery, [meterIds]),
      this.repo.query(settlementStatsQuery, [
        meterIds,
        today.toISOString(),
        tomorrow.toISOString(),
      ]),
    ]);

    const deviceStats = deviceResults[0] || {
      total_devices: '0',
      online_devices: '0',
      latest_heartbeat: null,
    };
    const settlementStats = settlementResults[0] || { settlements_today: '0' };

    return {
      totalDevices: parseInt(deviceStats.total_devices, 10) || 0,
      onlineDevices: parseInt(deviceStats.online_devices, 10) || 0,
      lastHeartbeat: deviceStats.latest_heartbeat
        ? new Date(deviceStats.latest_heartbeat).toISOString()
        : null,
      settlementsToday: parseInt(settlementStats.settlements_today, 10) || 0,
    };
  }

  /**
   * Get optimized settlement statistics for dashboard using aggregated queries.
   *
   * @param meterIds - Array of meter IDs
   * @returns Object with settlement statistics
   */
  async findSettlementStatsForDashboard(meterIds: string[]): Promise<{
    totalSettlements: number;
    successfulSettlements: number;
    pendingSettlements: number;
    todaySettlements: number;
    lastSettlementTime: string | null;
    totalEtkMinted: number;
    totalEtkBurned: number;
  }> {
    if (meterIds.length === 0) {
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

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Use raw SQL for optimal performance
    const settlementStatsQuery = `
      SELECT 
        COUNT(*) as total_settlements,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful_settlements,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_settlements,
        COUNT(CASE WHEN created_at_backend >= $2 AND created_at_backend < $3 THEN 1 END) as today_settlements,
        MAX(created_at_backend) as last_settlement_time,
        SUM(CASE WHEN net_kwh_from_grid > 0 THEN ABS(net_kwh_from_grid) ELSE 0 END) as total_etk_minted,
        SUM(CASE WHEN net_kwh_from_grid < 0 THEN ABS(net_kwh_from_grid) ELSE 0 END) as total_etk_burned
      FROM energy_settlements 
      WHERE meter_id = ANY($1);
    `;

    interface SettlementStatsResult {
      total_settlements: string;
      successful_settlements: string;
      pending_settlements: string;
      today_settlements: string;
      last_settlement_time: string | null;
      total_etk_minted: string | null;
      total_etk_burned: string | null;
    }

    const results = await this.repo.query(settlementStatsQuery, [
      meterIds,
      today.toISOString(),
      tomorrow.toISOString(),
    ]);

    const stats = results[0] || {
      total_settlements: '0',
      successful_settlements: '0',
      pending_settlements: '0',
      today_settlements: '0',
      last_settlement_time: null,
      total_etk_minted: null,
      total_etk_burned: null,
    };

    return {
      totalSettlements: parseInt(stats.total_settlements, 10) || 0,
      successfulSettlements: parseInt(stats.successful_settlements, 10) || 0,
      pendingSettlements: parseInt(stats.pending_settlements, 10) || 0,
      todaySettlements: parseInt(stats.today_settlements, 10) || 0,
      lastSettlementTime: stats.last_settlement_time
        ? new Date(stats.last_settlement_time).toISOString()
        : null,
      totalEtkMinted: parseFloat(stats.total_etk_minted || '0') || 0,
      totalEtkBurned: parseFloat(stats.total_etk_burned || '0') || 0,
    };
  }

  /**
   * Get the latest sensor data timestamp for heartbeat detection.
   * Used to determine if a device is online based on MQTT sensor message frequency.
   *
   * @param meterId - The meter ID to check
   * @returns Promise resolving to the latest sensor timestamp or null if no data found
   */
  async findLatestSensorTimestamp(meterId: string): Promise<Date | null> {
    const result = await this.repo
      .createQueryBuilder('reading')
      .select('reading.timestamp')
      .where('reading.meterId = :meterId', { meterId })
      .orderBy('reading.timestamp', 'DESC')
      .limit(1)
      .getOne();

    return result ? result.timestamp : null;
  }
}
