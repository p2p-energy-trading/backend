import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { TelemetryAggregate } from '../models/TelemetryAggregate/TelemetryAggregate.entity';
import { createObjectCsvStringifier } from 'csv-writer';

/**
 * Service to archive old telemetry data to blob storage and clean up PostgreSQL
 *
 * NOTE: With TimescaleDB retention policy, this archival service is OPTIONAL.
 * TimescaleDB automatically deletes data older than 5 years via retention policy.
 *
 * This service provides:
 * - Additional backup in MinIO before data deletion
 * - Compliance/audit trail in CSV format
 * - Ability to restore archived data if needed
 *
 * Runs every 30 days to archive and export data older than 5 years to MinIO,
 * then deletes from PostgreSQL. If you prefer to rely solely on TimescaleDB
 * retention policy, you can disable this service.
 */
@Injectable()
export class TelemetryArchivalService {
  private readonly logger = new Logger(TelemetryArchivalService.name);
  private minioClient: Minio.Client | null = null;
  private readonly RETENTION_DAYS = 1825; // 5 years (365 * 5)
  private readonly ARCHIVE_BUCKET = 'telemetry-archive';

  constructor(
    @InjectRepository(TelemetryAggregate)
    private telemetryAggregateRepository: Repository<TelemetryAggregate>,
    private configService: ConfigService,
  ) {
    this.initializeMinioClient();
  }

  /**
   * Initialize MinIO/S3 client
   */
  private initializeMinioClient() {
    try {
      const minioEndpoint = this.configService.get<string>('MINIO_ENDPOINT');
      const minioPort = this.configService.get<number>('MINIO_PORT', 9000);
      const minioAccessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
      const minioSecretKey = this.configService.get<string>('MINIO_SECRET_KEY');
      const minioUseSSL =
        this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';

      if (!minioEndpoint || !minioAccessKey || !minioSecretKey) {
        this.logger.warn(
          'MinIO configuration incomplete. Archival service will not function.',
        );
        return;
      }

      this.minioClient = new Minio.Client({
        endPoint: minioEndpoint,
        port: minioPort,
        useSSL: minioUseSSL,
        accessKey: minioAccessKey,
        secretKey: minioSecretKey,
      });

      this.logger.log(
        `MinIO client initialized: ${minioEndpoint}:${minioPort}`,
      );

      // Ensure bucket exists
      void this.ensureBucketExists();
    } catch (error) {
      this.logger.error('Failed to initialize MinIO client:', error);
    }
  }

  /**
   * Ensure the archive bucket exists
   */
  private async ensureBucketExists(): Promise<void> {
    if (!this.minioClient) return;

    try {
      const bucketExists = await this.minioClient.bucketExists(
        this.ARCHIVE_BUCKET,
      );

      if (!bucketExists) {
        await this.minioClient.makeBucket(this.ARCHIVE_BUCKET, 'us-east-1');
        this.logger.log(`Created bucket: ${this.ARCHIVE_BUCKET}`);
      }
    } catch (error) {
      this.logger.error('Error ensuring bucket exists:', error);
    }
  }

  /**
   * Cron job that runs every 30 days to archive old data
   *
   * DISABLED: TimescaleDB retention policy handles data lifecycle automatically.
   * Uncomment @Cron decorator if you need additional backup to MinIO.
   */
  // @Cron('0 0 2 */30 * *', {
  //   name: 'monthly-telemetry-archival',
  // })
  async archiveOldData() {
    if (!this.minioClient) {
      this.logger.warn('MinIO client not initialized, skipping archival');
      return;
    }

    this.logger.log(
      'Starting monthly telemetry archival process (every 30 days)',
    );

    try {
      // Calculate cutoff date (5 years ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

      this.logger.log(`Archiving data older than: ${cutoffDate.toISOString()}`);

      // Get count of records to archive
      const recordCount = await this.telemetryAggregateRepository.count({
        where: {
          hourStart: LessThan(cutoffDate),
        },
      });

      if (recordCount === 0) {
        this.logger.log('No records to archive');
        return;
      }

      this.logger.log(`Found ${recordCount} records to archive`);

      // Get all meters that have old data
      const metersWithOldData = await this.telemetryAggregateRepository
        .createQueryBuilder('t')
        .select('DISTINCT t.meterId', 'meterId')
        .where('t.hourStart < :cutoffDate', { cutoffDate })
        .getRawMany();

      this.logger.log(`Archiving data for ${metersWithOldData.length} meters`);

      // Archive each meter's data separately
      for (const { meterId } of metersWithOldData) {
        await this.archiveMeterData(meterId, cutoffDate);
      }

      this.logger.log('Monthly archival process completed (every 30 days)');
    } catch (error) {
      this.logger.error('Error in monthly archival process:', error);
    }
  }

  /**
   * Archive data for a specific meter
   */
  private async archiveMeterData(
    meterId: string,
    cutoffDate: Date,
  ): Promise<void> {
    try {
      // Fetch old records for this meter
      const oldRecords = await this.telemetryAggregateRepository.find({
        where: {
          meterId,
          hourStart: LessThan(cutoffDate),
        },
        order: {
          hourStart: 'ASC',
        },
      });

      if (oldRecords.length === 0) {
        return;
      }

      this.logger.log(
        `Archiving ${oldRecords.length} records for meter ${meterId}`,
      );

      // Convert to CSV
      const csvContent = await this.convertToCSV(oldRecords);

      // Generate filename with date range
      const firstDate = oldRecords[0].hourStart.toISOString().split('T')[0];
      const lastDate = oldRecords[oldRecords.length - 1].hourStart
        .toISOString()
        .split('T')[0];
      const filename = `${meterId}/${meterId}_${firstDate}_to_${lastDate}.csv`;

      // Upload to MinIO
      await this.uploadToMinIO(filename, csvContent);

      // Delete archived records from PostgreSQL
      await this.deleteArchivedRecords(oldRecords.map((r) => r.id));

      this.logger.log(
        `Successfully archived and deleted ${oldRecords.length} records for meter ${meterId}`,
      );
    } catch (error) {
      this.logger.error(`Error archiving data for meter ${meterId}:`, error);
      throw error;
    }
  }

  /**
   * Convert telemetry aggregates to CSV format
   */
  private async convertToCSV(records: TelemetryAggregate[]): Promise<string> {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'ID' },
        { id: 'meterId', title: 'Meter ID' },
        { id: 'hourStart', title: 'Hour Start' },
        { id: 'dataPointsCount', title: 'Data Points' },
        { id: 'batteryVoltageAvg', title: 'Battery Voltage Avg (V)' },
        { id: 'batteryVoltageMin', title: 'Battery Voltage Min (V)' },
        { id: 'batteryVoltageMax', title: 'Battery Voltage Max (V)' },
        { id: 'batterySocAvg', title: 'Battery SOC Avg (%)' },
        { id: 'batterySocMin', title: 'Battery SOC Min (%)' },
        { id: 'batterySocMax', title: 'Battery SOC Max (%)' },
        { id: 'batteryChargeRateAvg', title: 'Battery Charge Rate Avg (%/hr)' },
        { id: 'exportPowerAvg', title: 'Export Power Avg (mW)' },
        { id: 'exportPowerMax', title: 'Export Power Max (mW)' },
        { id: 'exportEnergyTotal', title: 'Export Energy Total (Wh)' },
        { id: 'importPowerAvg', title: 'Import Power Avg (mW)' },
        { id: 'importPowerMax', title: 'Import Power Max (mW)' },
        { id: 'importEnergyTotal', title: 'Import Energy Total (Wh)' },
        { id: 'loadSmartPowerAvg', title: 'Load Smart Power Avg (mW)' },
        { id: 'loadSmartPowerMax', title: 'Load Smart Power Max (mW)' },
        { id: 'loadSmartEnergyTotal', title: 'Load Smart Energy Total (Wh)' },
        { id: 'loadHomePowerAvg', title: 'Load Home Power Avg (mW)' },
        { id: 'loadHomePowerMax', title: 'Load Home Power Max (mW)' },
        { id: 'loadHomeEnergyTotal', title: 'Load Home Energy Total (Wh)' },
        { id: 'solarInputPowerAvg', title: 'Solar Input Power Avg (mW)' },
        { id: 'solarInputPowerMax', title: 'Solar Input Power Max (mW)' },
        { id: 'solarInputEnergyTotal', title: 'Solar Input Energy Total (Wh)' },
        { id: 'solarOutputPowerAvg', title: 'Solar Output Power Avg (mW)' },
        { id: 'solarOutputPowerMax', title: 'Solar Output Power Max (mW)' },
        {
          id: 'solarOutputEnergyTotal',
          title: 'Solar Output Energy Total (Wh)',
        },
        { id: 'netSolarPowerAvg', title: 'Net Solar Power Avg (mW)' },
        { id: 'netSolarEnergyTotal', title: 'Net Solar Energy Total (Wh)' },
        { id: 'netGridPowerAvg', title: 'Net Grid Power Avg (mW)' },
        { id: 'netGridEnergyTotal', title: 'Net Grid Energy Total (Wh)' },
        { id: 'wifiRssiAvg', title: 'WiFi RSSI Avg (dBm)' },
        { id: 'mqttDisconnections', title: 'MQTT Disconnections' },
        { id: 'freeHeapAvg', title: 'Free Heap Avg (bytes)' },
        { id: 'createdAt', title: 'Created At' },
      ],
    });

    const header = csvStringifier.getHeaderString();
    const records_csv = csvStringifier.stringifyRecords(
      records.map((r) => ({
        ...r,
        hourStart: r.hourStart.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
    );

    return header + records_csv;
  }

  /**
   * Upload CSV file to MinIO
   */
  private async uploadToMinIO(
    filename: string,
    content: string,
  ): Promise<void> {
    if (!this.minioClient) {
      throw new Error('MinIO client not initialized');
    }

    try {
      const buffer = Buffer.from(content, 'utf-8');

      await this.minioClient.putObject(
        this.ARCHIVE_BUCKET,
        filename,
        buffer,
        buffer.length,
        {
          'Content-Type': 'text/csv',
          'X-Archived-At': new Date().toISOString(),
        },
      );

      this.logger.log(`Uploaded archive to MinIO: ${filename}`);
    } catch (error) {
      this.logger.error(`Error uploading to MinIO: ${filename}`, error);
      throw error;
    }
  }

  /**
   * Delete archived records from PostgreSQL
   */
  private async deleteArchivedRecords(recordIds: string[]): Promise<void> {
    try {
      // Delete in batches of 1000 to avoid overwhelming the database
      const batchSize = 1000;

      for (let i = 0; i < recordIds.length; i += batchSize) {
        const batch = recordIds.slice(i, i + batchSize);
        await this.telemetryAggregateRepository.delete(batch);
      }

      this.logger.log(
        `Deleted ${recordIds.length} archived records from PostgreSQL`,
      );
    } catch (error) {
      this.logger.error('Error deleting archived records:', error);
      throw error;
    }
  }

  /**
   * Manual trigger for testing or recovery
   * Archives data older than specified date
   */
  async manualArchive(beforeDate: Date): Promise<void> {
    if (!this.minioClient) {
      throw new Error('MinIO client not initialized');
    }

    this.logger.log(
      `Manual archive triggered for data before: ${beforeDate.toISOString()}`,
    );

    const metersWithOldData = await this.telemetryAggregateRepository
      .createQueryBuilder('t')
      .select('DISTINCT t.meterId', 'meterId')
      .where('t.hourStart < :beforeDate', { beforeDate })
      .getRawMany();

    for (const { meterId } of metersWithOldData) {
      await this.archiveMeterData(meterId, beforeDate);
    }

    this.logger.log('Manual archive completed');
  }

  /**
   * Get archive statistics
   */
  async getArchiveStats(): Promise<{
    oldestRecord: Date | null;
    newestRecord: Date | null;
    totalRecords: number;
    recordsToArchive: number;
  }> {
    const [oldestResult, newestResult, totalRecords] = await Promise.all([
      this.telemetryAggregateRepository.findOne({
        order: { hourStart: 'ASC' },
        select: ['hourStart'],
      }),
      this.telemetryAggregateRepository.findOne({
        order: { hourStart: 'DESC' },
        select: ['hourStart'],
      }),
      this.telemetryAggregateRepository.count(),
    ]);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    const recordsToArchive = await this.telemetryAggregateRepository.count({
      where: {
        hourStart: LessThan(cutoffDate),
      },
    });

    return {
      oldestRecord: oldestResult?.hourStart || null,
      newestRecord: newestResult?.hourStart || null,
      totalRecords,
      recordsToArchive,
    };
  }
}
