import { Injectable, Logger } from '@nestjs/common';
import { SmartMetersService } from '../../models/smartMeter/SmartMeters.service';
import { RedisTelemetryService } from '../telemetry/redis-telemetry.service';
import { EnergySettlementsService } from '../../models/energySettlement/energySettlement.service';

/**
 * Service for smart meter health monitoring and connectivity
 * Renamed from DeviceHealthService for better clarity
 * Extracted from DashboardService to follow Single Responsibility Principle
 */
@Injectable()
export class SmartMeterHealthService {
  private readonly logger = new Logger(SmartMeterHealthService.name);
  private readonly OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

  constructor(
    private smartMetersService: SmartMetersService,
    private redisTelemetryService: RedisTelemetryService,
    private energySettlementsService: EnergySettlementsService,
  ) {}

  /**
   * Get overall device health status for a prosumer
   * Returns aggregate health metrics across all devices
   */
  async getDeviceHealth(prosumerId: string) {
    try {
      // Get prosumer's meters
      const devices = await this.smartMetersService.findAll({ prosumerId });
      const meterIds: string[] = devices.map(
        (d: { meterId: string }) => d.meterId,
      );

      if (meterIds.length === 0) {
        return this.getEmptyDeviceHealth();
      }

      // Get device status for each meter
      const deviceStatuses = await Promise.all(
        meterIds.map(async (meterId) => {
          const status =
            await this.redisTelemetryService.getLatestStatus(meterId);
          return { meterId, status };
        }),
      );

      // Calculate online/offline devices
      const now = Date.now();
      let onlineDevices = 0;
      let totalUptime = 0;
      let deviceCount = 0;
      let lastHeartbeat: Date | null = null;

      for (const { meterId, status } of deviceStatuses) {
        if (status && status.data) {
          const statusTime = status.datetime
            ? new Date(status.datetime).getTime()
            : 0;
          const isOnline =
            statusTime > 0 && now - statusTime < this.OFFLINE_THRESHOLD_MS;

          if (isOnline) {
            onlineDevices++;
          }

          // Calculate uptime
          if (status.data.system?.uptime) {
            totalUptime += Number(status.data.system.uptime);
            deviceCount++;
          }

          // Track latest heartbeat
          if (statusTime > 0) {
            const heartbeatDate = new Date(status.datetime);
            if (!lastHeartbeat || heartbeatDate > lastHeartbeat) {
              lastHeartbeat = heartbeatDate;
            }
          }
        }
      }

      // Calculate average uptime percentage (uptime in ms / 10 min window * 100)
      const averageUptime =
        deviceCount > 0
          ? Math.round(
              (totalUptime / deviceCount / (10 * 60 * 1000)) * 100 * 100,
            ) / 100
          : 0;

      // Get today's settlements count
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const allSettlements = await this.energySettlementsService.findAll();
      const todaySettlements = allSettlements.filter((s: any) => {
        const meterId = (s as { meterId?: string })?.meterId;
        const createdAt = (s as { createdAtBackend?: string | Date })
          ?.createdAtBackend;

        if (!meterId || !meterIds.includes(meterId) || !createdAt) {
          return false;
        }

        const date = new Date(createdAt);
        return date >= todayStart;
      });

      const offlineDevices = meterIds.length - onlineDevices;
      const healthPercentage =
        meterIds.length > 0
          ? Math.round((onlineDevices / meterIds.length) * 100)
          : 0;

      return {
        totalDevices: meterIds.length,
        onlineDevices,
        offlineDevices,
        healthPercentage,
        lastHeartbeat: lastHeartbeat ? lastHeartbeat.toISOString() : null,
        averageUptime,
        authorizedDevices: meterIds.length, // All registered meters are considered authorized
        settlementsToday: todaySettlements.length,
      };
    } catch (error) {
      this.logger.error('Error getting device health:', error);
      return this.getEmptyDeviceHealth();
    }
  }

  /**
   * Get detailed health information for a specific meter
   */
  async getDeviceHealthDetails(meterId: string) {
    try {
      // Get meter info
      const meter = await this.smartMetersService.findOne(meterId);
      if (!meter) {
        return null;
      }

      // Get latest status from Redis
      const status = await this.redisTelemetryService.getLatestStatus(meterId);
      const data = await this.redisTelemetryService.getLatestData(meterId);

      const now = Date.now();
      const statusTime = status?.datetime
        ? new Date(status.datetime).getTime()
        : 0;
      const isOnline =
        statusTime > 0 && now - statusTime < this.OFFLINE_THRESHOLD_MS;

      // Calculate time since last seen
      const timeSinceLastSeen = statusTime > 0 ? now - statusTime : null;
      const lastSeenMinutes = timeSinceLastSeen
        ? Math.floor(timeSinceLastSeen / (60 * 1000))
        : null;

      return {
        meterId,
        isOnline,
        lastSeen: status?.datetime || null,
        lastSeenMinutes,
        connectivity: {
          wifi: {
            connected: status?.data?.wifi?.connected || false,
            rssi: status?.data?.wifi?.rssi || null,
            ip: status?.data?.wifi?.ip || null,
          },
          mqtt: {
            connected: status?.data?.mqtt?.connected || false,
            attempts: status?.data?.mqtt?.attempts || 0,
            qos: status?.data?.mqtt?.qos || 0,
          },
        },
        system: {
          uptime: status?.data?.system?.uptime || 0,
          uptimeHours: status?.data?.system?.uptime
            ? Math.floor(Number(status.data.system.uptime) / (60 * 60 * 1000))
            : 0,
          freeHeap: status?.data?.system?.free_heap || 0,
          status: status?.data?.system?.status || 'unknown',
        },
        grid: {
          mode: status?.data?.grid?.mode || 'unknown',
          importing: status?.data?.grid?.importing || false,
          exporting: status?.data?.grid?.exporting || false,
        },
        energy: data?.data
          ? {
              solar: {
                power: Number(data.data.solar_output?.power || 0) / 1000, // W to kW
                generating: data.data.solar_output?.generating || false,
              },
              load: {
                smartMeter: Number(data.data.load_smart_mtr?.power || 0) / 1000,
                home: Number(data.data.load_home?.power || 0) / 1000,
                total:
                  (Number(data.data.load_smart_mtr?.power || 0) +
                    Number(data.data.load_home?.power || 0)) /
                  1000,
              },
              grid: {
                export: Number(data.data.export?.power || 0) / 1000,
                import: Number(data.data.import?.power || 0) / 1000,
                exportActive: data.data.export?.active || false,
                importActive: data.data.import?.active || false,
              },
              battery: {
                voltage: data.data.battery?.voltage || 0,
                soc: data.data.battery?.soc || 0,
                chargeRate: data.data.battery?.charge_rate || 0,
                isCharging: data.data.battery?.is_charging || false,
                connected: data.data.battery?.connected || false,
              },
            }
          : null,
      };
    } catch (error) {
      this.logger.error(
        `Error getting device health details for ${meterId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get device status for multiple meters
   * Used by DashboardService
   */
  async getDeviceStatus(meterIds: string[]) {
    try {
      if (meterIds.length === 0) {
        return {
          totalDevices: 0,
          onlineDevices: 0,
          lastHeartbeat: null,
          authorizedDevices: 0,
          settlementsToday: 0,
          averageUptime: 0,
        };
      }

      // Get device statuses
      const deviceStatuses = await Promise.all(
        meterIds.map(async (meterId) => {
          const status =
            await this.redisTelemetryService.getLatestStatus(meterId);
          return { meterId, status };
        }),
      );

      // Calculate metrics
      const now = Date.now();
      let onlineDevices = 0;
      let totalUptime = 0;
      let deviceCount = 0;
      let lastHeartbeat: Date | null = null;

      for (const { status } of deviceStatuses) {
        if (status && status.data) {
          const statusTime = status.datetime
            ? new Date(status.datetime).getTime()
            : 0;
          const isOnline =
            statusTime > 0 && now - statusTime < this.OFFLINE_THRESHOLD_MS;

          if (isOnline) {
            onlineDevices++;
          }

          if (status.data.system?.uptime) {
            totalUptime += Number(status.data.system.uptime);
            deviceCount++;
          }

          if (statusTime > 0) {
            const heartbeatDate = new Date(status.datetime);
            if (!lastHeartbeat || heartbeatDate > lastHeartbeat) {
              lastHeartbeat = heartbeatDate;
            }
          }
        }
      }

      // Average uptime as percentage
      const averageUptime =
        deviceCount > 0
          ? Math.round(
              (totalUptime / deviceCount / (10 * 60 * 1000)) * 100 * 100,
            ) / 100
          : 0;

      // Get today's settlements
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const allSettlements = await this.energySettlementsService.findAll();
      const todaySettlements = allSettlements.filter((s: any) => {
        const meterId = (s as { meterId?: string })?.meterId;
        const createdAt = (s as { createdAtBackend?: string | Date })
          ?.createdAtBackend;

        if (!meterId || !meterIds.includes(meterId) || !createdAt) {
          return false;
        }

        const date = new Date(createdAt);
        return date >= todayStart;
      });

      return {
        totalDevices: meterIds.length,
        onlineDevices,
        lastHeartbeat: lastHeartbeat ? lastHeartbeat.toISOString() : null,
        authorizedDevices: meterIds.length,
        settlementsToday: todaySettlements.length,
        averageUptime,
      };
    } catch (error) {
      this.logger.error('Error getting device status:', error);
      return {
        totalDevices: meterIds.length,
        onlineDevices: 0,
        lastHeartbeat: null,
        authorizedDevices: 0,
        settlementsToday: 0,
        averageUptime: 0,
      };
    }
  }

  /**
   * Check device connectivity status
   */
  async checkDeviceConnectivity(meterId: string) {
    try {
      const status = await this.redisTelemetryService.getLatestStatus(meterId);

      if (!status || !status.data) {
        return {
          meterId,
          connected: false,
          lastSeen: null,
          reason: 'No status data available',
        };
      }

      const now = Date.now();
      const statusTime = status.datetime
        ? new Date(status.datetime).getTime()
        : 0;
      const isOnline =
        statusTime > 0 && now - statusTime < this.OFFLINE_THRESHOLD_MS;

      if (!isOnline) {
        const minutesOffline =
          statusTime > 0 ? Math.floor((now - statusTime) / (60 * 1000)) : null;

        return {
          meterId,
          connected: false,
          lastSeen: status.datetime,
          reason: minutesOffline
            ? `Offline for ${minutesOffline} minutes`
            : 'Never connected',
        };
      }

      // Check individual connections
      const wifiConnected = status.data.wifi?.connected || false;
      const mqttConnected = status.data.mqtt?.connected || false;

      if (!wifiConnected) {
        return {
          meterId,
          connected: false,
          lastSeen: status.datetime,
          reason: 'WiFi disconnected',
          details: {
            wifi: false,
            mqtt: mqttConnected,
          },
        };
      }

      if (!mqttConnected) {
        return {
          meterId,
          connected: false,
          lastSeen: status.datetime,
          reason: 'MQTT disconnected',
          details: {
            wifi: wifiConnected,
            mqtt: false,
            mqttAttempts: status.data.mqtt?.attempts || 0,
          },
        };
      }

      return {
        meterId,
        connected: true,
        lastSeen: status.datetime,
        reason: 'Connected',
        details: {
          wifi: {
            connected: true,
            rssi: status.data.wifi?.rssi || null,
            ip: status.data.wifi?.ip || null,
          },
          mqtt: {
            connected: true,
            qos: status.data.mqtt?.qos || 0,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Error checking connectivity for ${meterId}:`, error);
      return {
        meterId,
        connected: false,
        lastSeen: null,
        reason: 'Error checking connectivity',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get list of all devices with basic status
   */
  async getDeviceList(prosumerId: string) {
    try {
      // Get prosumer's meters
      const devices = await this.smartMetersService.findAll({ prosumerId });

      if (devices.length === 0) {
        return [];
      }

      // Get status for each device
      const deviceList = await Promise.all(
        devices.map(async (device: any) => {
          const meterId = (device as { meterId?: string })?.meterId || '';
          const status =
            await this.redisTelemetryService.getLatestStatus(meterId);

          const now = Date.now();
          const statusTime = status?.datetime
            ? new Date(status.datetime).getTime()
            : 0;
          const isOnline =
            statusTime > 0 && now - statusTime < this.OFFLINE_THRESHOLD_MS;

          return {
            meterId,
            name: (device as { name?: string })?.name || meterId,
            location: (device as { location?: string })?.location || null,
            status: isOnline ? 'online' : 'offline',
            lastSeen: status?.datetime || null,
            connectivity: {
              wifi: status?.data?.wifi?.connected || false,
              mqtt: status?.data?.mqtt?.connected || false,
              rssi: status?.data?.wifi?.rssi || null,
            },
            system: {
              uptime: status?.data?.system?.uptime || 0,
              freeHeap: status?.data?.system?.free_heap || 0,
            },
          };
        }),
      );

      return deviceList;
    } catch (error) {
      this.logger.error('Error getting device list:', error);
      return [];
    }
  }

  // Helper method for empty state
  private getEmptyDeviceHealth() {
    return {
      totalDevices: 0,
      onlineDevices: 0,
      offlineDevices: 0,
      healthPercentage: 0,
      lastHeartbeat: null,
      averageUptime: 0,
      authorizedDevices: 0,
      settlementsToday: 0,
    };
  }
}
