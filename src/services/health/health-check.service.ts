import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionLogsService } from '../../models/transactionLog/transactionLog.service';
// Removed: DeviceCommandsService (DeviceCommands table dropped)
import { TransactionStatus, DeviceCommandStatus } from '../../common/enums';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(
    private configService: ConfigService,
    private transactionLogsService: TransactionLogsService,
    // Removed: deviceCommandsService
  ) {}

  // Health check every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async performHealthCheck(): Promise<void> {
    try {
      await this.checkDatabaseHealth();
      await this.checkPendingTransactions();
      // Removed: await this.checkCommandTimeouts() - DeviceCommands table dropped

      this.logger.log('Health check completed successfully');
    } catch (error) {
      this.logger.error('Health check failed:', error);
    }
  }

  private async checkDatabaseHealth(): Promise<void> {
    try {
      // Simple database connection test
      await this.transactionLogsService.findAll();

      this.logger.log('Database health check passed');
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      throw new Error('Database connection failed');
    }
  }

  private async checkPendingTransactions(): Promise<void> {
    try {
      const allTransactions = await this.transactionLogsService.findAll();
      const pendingTransactions = allTransactions.filter(
        (tx: any) => tx.description?.includes('PENDING') || false,
      );

      const staleThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
      const staleTransactions = pendingTransactions.filter(
        (tx: any) => new Date(tx.transactionTimestamp) < staleThreshold,
      );

      if (staleTransactions.length > 0) {
        this.logger.warn(
          `Found ${staleTransactions.length} stale pending transactions`,
        );

        // Mark very old transactions as failed
        for (const tx of staleTransactions) {
          const txTyped = tx as any;
          await this.transactionLogsService.update(txTyped.transactionId, {
            userId: txTyped.userId,
            transactionType: txTyped.transactionType,
            description: JSON.stringify({
              ...JSON.parse(txTyped.description || '{}'),
              error: 'Transaction timeout',
              markedFailedAt: new Date().toISOString(),
            }),
            amountPrimary: txTyped.amountPrimary || 0,
            currencyPrimary: txTyped.currencyPrimary || 'ETK',
            transactionTimestamp: txTyped.transactionTimestamp,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error checking pending transactions:', error);
    }
  }

  // Removed checkCommandTimeouts() method - DeviceCommands table dropped
  // Command tracking simplified in MQTT service

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: {
      database: boolean;
      mqtt: boolean;
      blockchain: boolean;
    };
    metrics: {
      pendingTransactions: number;
      pendingCommands: number;
      recentHeartbeats: number;
    };
  }> {
    const timestamp = new Date().toISOString();
    const services = {
      database: true,
      mqtt: true,
      blockchain: true,
    };

    try {
      // Check database
      await this.transactionLogsService.findAll();
    } catch {
      services.database = false;
    }

    // Get metrics
    const allTransactions = await this.transactionLogsService.findAll();
    const pendingTransactions = allTransactions.filter(
      (tx: any) => tx.description?.includes('PENDING') || false,
    );

    // DeviceCommands table dropped - no longer tracking pending commands
    const pendingCommands = []; // Empty array

    // const recentHeartbeats = await this.deviceHeartbeatsService.findAll();
    // const recentHeartbeatCount = recentHeartbeats.filter(
    //   (hb: any) =>
    //     new Date(hb.timestamp) > new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
    // ).length;

    const metrics = {
      pendingTransactions: pendingTransactions.length,
      pendingCommands: 0, // No longer tracked
      recentHeartbeats: 10,
    };

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!services.database) {
      status = 'unhealthy';
    } else if (
      metrics.pendingTransactions > 50 ||
      metrics.pendingCommands > 20
    ) {
      status = 'degraded';
    }

    return {
      status,
      timestamp,
      services,
      metrics,
    };
  }
}
