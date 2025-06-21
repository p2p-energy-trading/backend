import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SmartMetersService } from '../graphql/SmartMeters/SmartMeters.service';
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
      // Get device info from smart meters
      const device = await this.smartMetersService.findOne(meterId);

      // Get latest status snapshot for device health info
      const statusSnapshots =
        await this.smartMetersService.findDevicestatussnapshotsList(meterId);
      const latestStatus = (statusSnapshots as any[]).sort((a: any, b: any) => {
        const timestampA = String(a?.timestamp || '');
        const timestampB = String(b?.timestamp || '');
        return new Date(timestampB).getTime() - new Date(timestampA).getTime();
      })[0];

      // Get latest energy readings for activity monitoring
      const energyReadings =
        await this.smartMetersService.findEnergyreadingsdetailedList(meterId);
      const latestReading = (energyReadings as any[]).sort((a: any, b: any) => {
        const timestampA = String(a?.timestamp || '');
        const timestampB = String(b?.timestamp || '');
        return new Date(timestampB).getTime() - new Date(timestampA).getTime();
      })[0];

      const status: DeviceHealthStatus = {
        meterId,
        isOnline: false,
        lastHeartbeat: device.lastHeartbeatAt?.toString() || null,
        uptimeSeconds: 0,
        signalStrength: 0,
        errorCodes: [],
        alerts: [],
      };

      // Check if device is online based on last heartbeat timestamp
      if (device.lastHeartbeatAt) {
        const heartbeatTime = new Date(device.lastHeartbeatAt);
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

      // Extract signal strength and other metrics from status snapshots
      if (latestStatus?.statusData) {
        try {
          const statusData = JSON.parse(
            latestStatus.statusData as string,
          ) as any;

          // Extract WiFi signal strength
          if (statusData.wifi?.rssi) {
            status.signalStrength = Number(statusData.wifi.rssi);

            if (status.signalStrength < this.LOW_SIGNAL_THRESHOLD) {
              status.alerts.push(
                `Low signal strength: ${status.signalStrength} dBm`,
              );
              await this.logDeviceAlert(
                meterId,
                'LOW_SIGNAL',
                `Low signal strength: ${status.signalStrength} dBm`,
              );
            }
          }

          // Calculate uptime from system info if available
          if (statusData.system?.uptime) {
            status.uptimeSeconds = Number(statusData.system.uptime) / 1000; // Convert ms to seconds
          }

          // Check for connection issues
          if (statusData.mqtt?.connected === false) {
            status.alerts.push('MQTT connection lost');
            await this.logDeviceAlert(
              meterId,
              'MQTT_DISCONNECTED',
              'MQTT connection lost',
            );
          }

          if (statusData.wifi?.connected === false) {
            status.alerts.push('WiFi connection lost');
            await this.logDeviceAlert(
              meterId,
              'WIFI_DISCONNECTED',
              'WiFi connection lost',
            );
          }
        } catch (error) {
          this.logger.warn(`Error parsing status data for ${meterId}:`, error);
        }
      }

      // Check for recent activity based on energy readings
      if (latestReading) {
        const readingTime = new Date(latestReading.timestamp);
        const now = new Date();
        const timeDiff = (now.getTime() - readingTime.getTime()) / (1000 * 60); // minutes

        if (timeDiff > this.OFFLINE_THRESHOLD_MINUTES * 2) {
          status.alerts.push(
            `No recent energy data for ${Math.round(timeDiff)} minutes`,
          );
          await this.logDeviceAlert(
            meterId,
            'NO_ENERGY_DATA',
            `No recent energy data for ${Math.round(timeDiff)} minutes`,
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
