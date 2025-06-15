import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SmartMetersService } from '../graphql/SmartMeters/SmartMeters.service';
import { DeviceHeartbeatsService } from '../graphql/DeviceHeartbeats/DeviceHeartbeats.service';
import { TransactionLogsService } from '../graphql/TransactionLogs/TransactionLogs.service';
import { TransactionType } from '../common/enums';

interface DeviceHealthStatus {
  meterId: string;
  isOnline: boolean;
  lastHeartbeat: string | null;
  uptimeSeconds: number;
  signalStrength: number;
  batteryLevel?: number;
  errorCodes: string[];
  alerts: string[];
}

interface DeviceAlert {
  id: string;
  meterId: string;
  alertType: string;
  message: string;
  timestamp: string;
}

@Injectable()
export class DeviceMonitoringService {
  private readonly logger = new Logger(DeviceMonitoringService.name);
  private readonly OFFLINE_THRESHOLD_MINUTES = 10;
  private readonly LOW_SIGNAL_THRESHOLD = -80; // dBm
  private readonly LOW_BATTERY_THRESHOLD = 20; // percentage

  constructor(
    private smartMetersService: SmartMetersService,
    private deviceHeartbeatsService: DeviceHeartbeatsService,
    private transactionLogsService: TransactionLogsService,
  ) {}

  // Check device health every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorDeviceHealth() {
    this.logger.log('Starting device health monitoring');

    try {
      const activeDevices = await this.smartMetersService.findAll({
        status: 'ACTIVE',
      });

      for (const device of activeDevices) {
        await this.checkDeviceHealth(device.meterId);
      }

      this.logger.log(`Monitored ${activeDevices.length} devices`);
    } catch (error) {
      this.logger.error('Error in device health monitoring:', error);
    }
  }

  async checkDeviceHealth(meterId: string): Promise<DeviceHealthStatus> {
    try {
      // Get latest heartbeat
      const heartbeats =
        await this.smartMetersService.findDeviceheartbeatsList(meterId);
      const latestHeartbeat = (heartbeats as any[]).sort((a: any, b: any) => {
        const timestampA = String(a?.timestamp || '');
        const timestampB = String(b?.timestamp || '');
        return new Date(timestampB).getTime() - new Date(timestampA).getTime();
      })[0];

      // Get latest status snapshot
      const statusSnapshots =
        await this.smartMetersService.findDevicestatussnapshotsList(meterId);
      const latestStatus = (statusSnapshots as any[]).sort((a: any, b: any) => {
        const timestampA = String(a?.timestamp || '');
        const timestampB = String(b?.timestamp || '');
        return new Date(timestampB).getTime() - new Date(timestampA).getTime();
      })[0];

      const status: DeviceHealthStatus = {
        meterId,
        isOnline: false,
        lastHeartbeat: latestHeartbeat?.timestamp?.toString() || null,
        uptimeSeconds: Number(latestHeartbeat?.uptimeSeconds) || 0,
        signalStrength: Number(latestHeartbeat?.signalStrength) || 0,
        errorCodes: [],
        alerts: [],
      };

      // Check if device is online
      if (latestHeartbeat) {
        const heartbeatTime = new Date(latestHeartbeat.timestamp);
        const now = new Date();
        const timeDiff =
          (now.getTime() - heartbeatTime.getTime()) / (1000 * 60); // minutes

        status.isOnline = timeDiff <= this.OFFLINE_THRESHOLD_MINUTES;

        if (!status.isOnline) {
          status.alerts.push(
            `Device offline for ${Math.round(timeDiff)} minutes`,
          );
          await this.logDeviceAlert(
            meterId,
            'DEVICE_OFFLINE',
            `Device offline for ${Math.round(timeDiff)} minutes`,
          );
        }
      } else {
        status.alerts.push('No heartbeat data available');
        await this.logDeviceAlert(
          meterId,
          'NO_HEARTBEAT',
          'No heartbeat data available',
        );
      }

      // Check signal strength
      if (status.signalStrength < this.LOW_SIGNAL_THRESHOLD) {
        status.alerts.push(`Low signal strength: ${status.signalStrength} dBm`);
        await this.logDeviceAlert(
          meterId,
          'LOW_SIGNAL',
          `Low signal strength: ${status.signalStrength} dBm`,
        );
      }

      // Check error codes from status
      if (latestStatus?.errorCodes) {
        status.errorCodes = (latestStatus.errorCodes as string)
          .split(',')
          .filter((code: string) => code.trim());
        if (status.errorCodes.length > 0) {
          status.alerts.push(
            `Error codes detected: ${status.errorCodes.join(', ')}`,
          );
          await this.logDeviceAlert(
            meterId,
            'ERROR_CODES',
            `Error codes: ${status.errorCodes.join(', ')}`,
          );
        }
      }

      // Check battery level if available
      if (latestHeartbeat?.additionalMetrics) {
        try {
          const metrics = JSON.parse(
            latestHeartbeat.additionalMetrics as string,
          ) as {
            batteryLevel?: number;
            [key: string]: any;
          };
          if (metrics.batteryLevel !== undefined) {
            status.batteryLevel = Number(metrics.batteryLevel);
            if (metrics.batteryLevel < this.LOW_BATTERY_THRESHOLD) {
              status.alerts.push(`Low battery: ${metrics.batteryLevel}%`);
              await this.logDeviceAlert(
                meterId,
                'LOW_BATTERY',
                `Low battery: ${metrics.batteryLevel}%`,
              );
            }
          }
        } catch (error) {
          this.logger.warn(
            `Error parsing additional metrics for ${meterId}:`,
            error,
          );
        }
      }

      return status;
    } catch (error) {
      this.logger.error(`Error checking device health for ${meterId}:`, error);
      return {
        meterId,
        isOnline: false,
        lastHeartbeat: null,
        uptimeSeconds: 0,
        signalStrength: 0,
        errorCodes: [],
        alerts: ['Health check failed'],
      };
    }
  }

  async getDeviceHealthStatus(
    prosumerId: string,
  ): Promise<DeviceHealthStatus[]> {
    try {
      // Get devices owned by prosumer
      const devices = await this.smartMetersService.findAll({ prosumerId });

      const healthStatuses = await Promise.all(
        devices.map((device) => this.checkDeviceHealth(device.meterId)),
      );

      return healthStatuses;
    } catch (error) {
      this.logger.error(
        `Error getting device health for prosumer ${prosumerId}:`,
        error,
      );
      return [];
    }
  }

  async getDeviceHealthSummary(prosumerId: string) {
    try {
      const healthStatuses = await this.getDeviceHealthStatus(prosumerId);

      const totalDevices = healthStatuses.length;
      const onlineDevices = healthStatuses.filter(
        (status) => status.isOnline,
      ).length;
      const devicesWithAlerts = healthStatuses.filter(
        (status) => status.alerts.length > 0,
      ).length;
      const totalAlerts = healthStatuses.reduce(
        (sum, status) => sum + status.alerts.length,
        0,
      );

      const avgSignalStrength =
        totalDevices > 0
          ? healthStatuses.reduce(
              (sum, status) => sum + status.signalStrength,
              0,
            ) / totalDevices
          : 0;

      const avgUptime =
        totalDevices > 0
          ? healthStatuses.reduce(
              (sum, status) => sum + status.uptimeSeconds,
              0,
            ) / totalDevices
          : 0;

      return {
        totalDevices,
        onlineDevices,
        offlineDevices: totalDevices - onlineDevices,
        devicesWithAlerts,
        totalAlerts,
        averageSignalStrength: Math.round(avgSignalStrength),
        averageUptimeHours: Math.round(avgUptime / 3600),
        healthScore: this.calculateHealthScore(healthStatuses),
      };
    } catch (error) {
      this.logger.error(
        `Error getting device health summary for ${prosumerId}:`,
        error,
      );
      return {
        totalDevices: 0,
        onlineDevices: 0,
        offlineDevices: 0,
        devicesWithAlerts: 0,
        totalAlerts: 0,
        averageSignalStrength: 0,
        averageUptimeHours: 0,
        healthScore: 0,
      };
    }
  }

  private calculateHealthScore(healthStatuses: DeviceHealthStatus[]): number {
    if (healthStatuses.length === 0) return 0;

    let totalScore = 0;

    for (const status of healthStatuses) {
      let deviceScore = 0;

      // Online status (40% weight)
      if (status.isOnline) deviceScore += 40;

      // Signal strength (30% weight)
      if (status.signalStrength >= -60) deviceScore += 30;
      else if (status.signalStrength >= -70) deviceScore += 20;
      else if (status.signalStrength >= -80) deviceScore += 10;

      // No error codes (20% weight)
      if (status.errorCodes.length === 0) deviceScore += 20;

      // Battery level (10% weight)
      if (status.batteryLevel === undefined || status.batteryLevel >= 50)
        deviceScore += 10;
      else if (status.batteryLevel >= 20) deviceScore += 5;

      totalScore += deviceScore;
    }

    return Math.round(totalScore / healthStatuses.length);
  }

  private async logDeviceAlert(
    meterId: string,
    alertType: string,
    message: string,
  ) {
    try {
      await this.transactionLogsService.create({
        prosumerId: 'SYSTEM',
        transactionType: TransactionType.DEVICE_COMMAND,
        description: JSON.stringify({
          alertType,
          meterId,
          message,
          timestamp: new Date().toISOString(),
        }),
        amountPrimary: 0,
        currencyPrimary: 'ALERT',
        blockchainTxHash: undefined,
        transactionTimestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error logging device alert for ${meterId}:`, error);
    }
  }

  async getDeviceAlerts(prosumerId: string, limit: number = 50) {
    try {
      // Get recent device alerts from transaction logs
      const logs = await this.transactionLogsService.findAll({
        transactionType: TransactionType.DEVICE_COMMAND,
      });

      // Filter and sort alerts - using description field instead of details
      const alerts = logs
        .map((log) => {
          try {
            const details = JSON.parse(log.description || '{}') as any;
            return {
              id: log.logId?.toString() || 'unknown',
              meterId: details.meterId || 'unknown',
              alertType: details.alertType || 'unknown',
              message: details.message || 'No message',
              timestamp:
                details.timestamp ||
                log.transactionTimestamp?.toISOString() ||
                new Date().toISOString(),
            };
          } catch {
            return null;
          }
        })
        .filter((alert) => alert !== null)
        .sort(
          (a, b) =>
            new Date(b!.timestamp).getTime() - new Date(a!.timestamp).getTime(),
        )
        .slice(0, limit);

      return alerts;
    } catch (error) {
      this.logger.error(
        `Error getting device alerts for ${prosumerId}:`,
        error,
      );
      return [];
    }
  }
}
