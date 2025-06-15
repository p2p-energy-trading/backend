import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionLogsService } from '../graphql/TransactionLogs/TransactionLogs.service';
import { DeviceHeartbeatsService } from '../graphql/DeviceHeartbeats/DeviceHeartbeats.service';
import { DeviceCommandsService } from '../graphql/DeviceCommands/DeviceCommands.service';
import { TransactionStatus, DeviceCommandStatus } from '../common/enums';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(
    private configService: ConfigService,
    private transactionLogsService: TransactionLogsService,
    private deviceHeartbeatsService: DeviceHeartbeatsService,
    private deviceCommandsService: DeviceCommandsService,
  ) {}

  // Health check every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async performHealthCheck(): Promise<void> {
    try {
      await this.checkDatabaseHealth();
      await this.checkPendingTransactions();
      await this.checkCommandTimeouts();

      this.logger.log('Health check completed successfully');
    } catch (error) {
      this.logger.error('Health check failed:', error);
    }
  }

  private async checkDatabaseHealth(): Promise<void> {
    try {
      // Simple database connection test
      await this.transactionLogsService.findAll();

      this.logger.debug('Database health check passed');
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
            prosumerId: txTyped.prosumerId,
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

  private async checkCommandTimeouts(): Promise<void> {
    try {
      const allCommands = await this.deviceCommandsService.findAll();
      const pendingCommands = allCommands.filter(
        (cmd: any) => cmd.status === DeviceCommandStatus.SENT,
      );

      const timeoutThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
      const timedOutCommands = pendingCommands.filter(
        (cmd: any) => new Date(cmd.sentAt) < timeoutThreshold,
      );

      if (timedOutCommands.length > 0) {
        this.logger.warn(`Found ${timedOutCommands.length} timed out commands`);

        for (const cmd of timedOutCommands) {
          const cmdTyped = cmd as any;
          await this.deviceCommandsService.update(cmdTyped.commandId, {
            meterId: cmdTyped.meterId,
            commandType: cmdTyped.commandType,
            commandPayload: cmdTyped.commandPayload,
            correlationId: cmdTyped.correlationId,
            status: DeviceCommandStatus.TIMEOUT,
            sentAt: cmdTyped.sentAt,
            acknowledgedAt: new Date().toISOString(),
            responsePayload: JSON.stringify({ error: 'Command timeout' }),
          });
        }
      }
    } catch (error) {
      this.logger.error('Error checking command timeouts:', error);
    }
  }

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

    const allCommands = await this.deviceCommandsService.findAll();
    const pendingCommands = allCommands.filter(
      (cmd: any) => cmd.status === DeviceCommandStatus.SENT,
    );

    const recentHeartbeats = await this.deviceHeartbeatsService.findAll();
    const recentHeartbeatCount = recentHeartbeats.filter(
      (hb: any) =>
        new Date(hb.timestamp) > new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
    ).length;

    const metrics = {
      pendingTransactions: pendingTransactions.length,
      pendingCommands: pendingCommands.length,
      recentHeartbeats: recentHeartbeatCount,
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
