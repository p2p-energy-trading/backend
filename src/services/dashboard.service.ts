import { Injectable, Logger } from '@nestjs/common';
import { EnergyReadingsDetailedService } from '../graphql/EnergyReadingsDetailed/EnergyReadingsDetailed.service';
import { EnergySettlementsService } from '../graphql/EnergySettlements/EnergySettlements.service';
import { MarketTradesService } from '../graphql/MarketTrades/MarketTrades.service';
import { SmartMetersService } from '../graphql/SmartMeters/SmartMeters.service';
import { WalletsService } from '../graphql/Wallets/Wallets.service';
import { BlockchainService } from './blockchain.service';

export interface DashboardStats {
  energyStats: {
    todayGeneration: number;
    todayConsumption: number;
    totalGeneration: number;
    totalConsumption: number;
    netEnergy: number;
  };
  tradingStats: {
    totalTrades: number;
    totalVolume: number;
    averagePrice: number;
    last24hVolume: number;
  };
  balances: {
    ETH: number;
    ETK: number;
    IDRS: number;
  };
  deviceStatus: {
    totalDevices: number;
    onlineDevices: number;
    lastHeartbeat: string | null;
  };
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private energyReadingsDetailedService: EnergyReadingsDetailedService,
    private energySettlementsService: EnergySettlementsService,
    private marketTradesService: MarketTradesService,
    private smartMetersService: SmartMetersService,
    private walletsService: WalletsService,
    private blockchainService: BlockchainService,
  ) {}

  async getDashboardStats(prosumerId: string): Promise<DashboardStats> {
    try {
      // Get prosumer's devices and wallets
      const [devices, wallets] = await Promise.all([
        this.getProsumeDevices(prosumerId),
        this.walletsService.findAll({ prosumerId }),
      ]);

      // Parallel fetch all stats
      const [energyStats, tradingStats, balances, deviceStatus] =
        await Promise.all([
          this.getEnergyStats(devices.map((d) => d.meterId)),
          this.getTradingStats(wallets.map((w) => w.walletAddress)),
          this.getBalances(wallets[0]?.walletAddress),
          this.getDeviceStatus(devices.map((d) => d.meterId)),
        ]);

      return {
        energyStats,
        tradingStats,
        balances,
        deviceStatus,
      };
    } catch (error) {
      this.logger.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  private async getProsumeDevices(prosumerId: string) {
    try {
      const devices = await this.smartMetersService.findAll({ prosumerId });
      return devices || [];
    } catch (error) {
      this.logger.warn(
        `Error fetching devices for prosumer ${prosumerId}:`,
        error,
      );
      return [];
    }
  }

  private async getEnergyStats(meterIds: string[]) {
    try {
      if (meterIds.length === 0) {
        return {
          todayGeneration: 0,
          todayConsumption: 0,
          totalGeneration: 0,
          totalConsumption: 0,
          netEnergy: 0,
        };
      }

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let todayGeneration = 0;
      let todayConsumption = 0;
      let totalGeneration = 0;
      let totalConsumption = 0;

      // Aggregate stats from all meters using detailed readings
      for (const meterId of meterIds) {
        const readings = await this.energyReadingsDetailedService.findAll({
          meterId,
        });

        // Group readings by timestamp to get complete meter snapshots
        const readingsByTimestamp = new Map<string, any[]>();

        for (const reading of readings) {
          const timestampKey = new Date(reading.timestamp).toISOString();
          if (!readingsByTimestamp.has(timestampKey)) {
            readingsByTimestamp.set(timestampKey, []);
          }
          readingsByTimestamp.get(timestampKey)!.push(reading);
        }

        // Process each timestamp group
        for (const [timestampStr, timestampReadings] of readingsByTimestamp) {
          const readingDate = new Date(timestampStr);
          let solarEnergyWh = 0;
          let loadEnergyWh = 0;

          // Extract generation and consumption from subsystem readings
          // NOTE: For dashboard stats, we use SOLAR for generation and LOAD for consumption
          // This is different from settlement which only uses GRID_EXPORT/GRID_IMPORT
          for (const reading of timestampReadings) {
            const dailyEnergy = Number(reading.dailyEnergyWh) || 0;

            switch (reading.subsystem) {
              case 'SOLAR':
                // Solar panels generate energy
                solarEnergyWh += dailyEnergy;
                break;
              case 'LOAD':
                // Electrical loads consume energy
                loadEnergyWh += dailyEnergy;
                break;
              // GRID_EXPORT and GRID_IMPORT are not included in generation/consumption stats
              // as they represent grid transactions, not local generation/consumption
            }
          }

          // Convert Wh to kWh
          const solarEnergyKwh = solarEnergyWh / 1000;
          const loadEnergyKwh = loadEnergyWh / 1000;

          totalGeneration += solarEnergyKwh;
          totalConsumption += loadEnergyKwh;

          if (readingDate >= today && readingDate < tomorrow) {
            todayGeneration += solarEnergyKwh;
            todayConsumption += loadEnergyKwh;
          }
        }
      }

      return {
        todayGeneration,
        todayConsumption,
        totalGeneration,
        totalConsumption,
        netEnergy: totalGeneration - totalConsumption,
      };
    } catch (error) {
      this.logger.error('Error getting energy stats:', error);
      return {
        todayGeneration: 0,
        todayConsumption: 0,
        totalGeneration: 0,
        totalConsumption: 0,
        netEnergy: 0,
      };
    }
  }

  private async getTradingStats(walletAddresses: string[]) {
    try {
      if (walletAddresses.length === 0) {
        return {
          totalTrades: 0,
          totalVolume: 0,
          averagePrice: 0,
          last24hVolume: 0,
        };
      }

      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const allTrades: any[] = [];

      // Get trades for all wallets
      for (const walletAddress of walletAddresses) {
        const buyTrades = await this.marketTradesService.findAll({
          buyerWalletAddress: walletAddress,
        });
        const sellTrades = await this.marketTradesService.findAll({
          sellerWalletAddress: walletAddress,
        });
        allTrades.push(...buyTrades, ...sellTrades);
      }

      // Remove duplicates
      const uniqueTrades = allTrades.filter(
        (trade, index, self) =>
          index === self.findIndex((t) => t.tradeId === trade.tradeId),
      );

      const totalTrades = uniqueTrades.length;
      const totalVolume = uniqueTrades.reduce(
        (sum, trade) => sum + (trade.tradedEtkAmount || 0),
        0,
      );
      const averagePrice =
        totalTrades > 0
          ? uniqueTrades.reduce(
              (sum, trade) => sum + (trade.priceIdrsPerEtk || 0),
              0,
            ) / totalTrades
          : 0;

      const last24hTrades = uniqueTrades.filter(
        (trade) => new Date(trade.tradeTimestamp) > last24Hours,
      );
      const last24hVolume = last24hTrades.reduce(
        (sum, trade) => sum + (trade.tradedEtkAmount || 0),
        0,
      );

      return {
        totalTrades,
        totalVolume,
        averagePrice,
        last24hVolume,
      };
    } catch (error) {
      this.logger.error('Error getting trading stats:', error);
      return {
        totalTrades: 0,
        totalVolume: 0,
        averagePrice: 0,
        last24hVolume: 0,
      };
    }
  }

  private async getBalances(walletAddress?: string) {
    if (!walletAddress) {
      return { ETH: 0, ETK: 0, IDRS: 0 };
    }

    try {
      const [ethBalance, etkBalance, idrsBalance] = await Promise.all([
        this.blockchainService.getEthBalance(walletAddress),
        this.blockchainService.getTokenBalance(
          walletAddress,
          process.env.CONTRACT_ETK_TOKEN ||
            '0x0000000000000000000000000000000000000000',
        ),
        this.blockchainService.getTokenBalance(
          walletAddress,
          process.env.CONTRACT_IDRS_TOKEN ||
            '0x0000000000000000000000000000000000000000',
        ),
      ]);

      return {
        ETH: ethBalance,
        ETK: etkBalance,
        IDRS: idrsBalance,
      };
    } catch (error) {
      this.logger.error('Error getting balances:', error);
      return { ETH: 0, ETK: 0, IDRS: 0 };
    }
  }

  private async getDeviceStatus(meterIds: string[]) {
    try {
      const totalDevices = meterIds.length;
      let onlineDevices = 0;
      let lastHeartbeat: string | null = null;

      for (const meterId of meterIds) {
        try {
          // Get device info directly from SmartMeters instead of using heartbeats relation
          const device = await this.smartMetersService.findOne(meterId);

          if (device.lastHeartbeatAt) {
            const heartbeatTime = new Date(device.lastHeartbeatAt);
            const now = new Date();
            const timeDiff = now.getTime() - heartbeatTime.getTime();

            // Consider device online if heartbeat is within 5 minutes
            if (timeDiff < 5 * 60 * 1000) {
              onlineDevices++;
            }

            if (!lastHeartbeat || heartbeatTime > new Date(lastHeartbeat)) {
              lastHeartbeat =
                device.lastHeartbeatAt instanceof Date
                  ? device.lastHeartbeatAt.toISOString()
                  : device.lastHeartbeatAt;
            }
          }
        } catch (error) {
          this.logger.warn(
            `Error checking device status for ${meterId}:`,
            error,
          );
        }
      }

      return {
        totalDevices,
        onlineDevices,
        lastHeartbeat,
      };
    } catch (error) {
      this.logger.error('Error getting device status:', error);
      return {
        totalDevices: meterIds.length,
        onlineDevices: 0,
        lastHeartbeat: null,
      };
    }
  }

  async getEnergyChartData(prosumerId: string, days: number = 7) {
    try {
      const devices = await this.getProsumeDevices(prosumerId);
      const meterIds = devices.map((d) => d.meterId);

      if (meterIds.length === 0) {
        return [];
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const chartData: Array<{
        date: string;
        generation: number;
        consumption: number;
        net: number;
        gridExport?: number;
        gridImport?: number;
      }> = [];

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);

        let dayGeneration = 0;
        let dayConsumption = 0;
        let dayGridExport = 0;
        let dayGridImport = 0;

        for (const meterId of meterIds) {
          const readings = await this.energyReadingsDetailedService.findAll({
            meterId,
          });

          const dayReadings = readings.filter((reading) => {
            const readingDate = new Date(reading.timestamp);
            return readingDate >= dayStart && readingDate <= dayEnd;
          });

          // Group by timestamp and aggregate daily energy
          const readingsByTimestamp = new Map<string, any[]>();

          for (const reading of dayReadings) {
            const timestampKey = new Date(reading.timestamp).toISOString();
            if (!readingsByTimestamp.has(timestampKey)) {
              readingsByTimestamp.set(timestampKey, []);
            }
            readingsByTimestamp.get(timestampKey)!.push(reading);
          }

          // Process each timestamp group for this day
          for (const [, timestampReadings] of readingsByTimestamp) {
            let solarEnergyWh = 0;
            let loadEnergyWh = 0;
            let gridExportWh = 0;
            let gridImportWh = 0;

            for (const reading of timestampReadings) {
              const dailyEnergy = Number(reading.dailyEnergyWh) || 0;

              switch (reading.subsystem) {
                case 'SOLAR':
                  solarEnergyWh += dailyEnergy;
                  break;
                case 'LOAD':
                  loadEnergyWh += dailyEnergy;
                  break;
                case 'GRID_EXPORT':
                  gridExportWh += dailyEnergy;
                  break;
                case 'GRID_IMPORT':
                  gridImportWh += dailyEnergy;
                  break;
              }
            }

            dayGeneration += solarEnergyWh / 1000; // Convert to kWh
            dayConsumption += loadEnergyWh / 1000; // Convert to kWh
            dayGridExport += gridExportWh / 1000; // Convert to kWh
            dayGridImport += gridImportWh / 1000; // Convert to kWh
          }
        }

        chartData.push({
          date: dayStart.toISOString().split('T')[0],
          generation: dayGeneration,
          consumption: dayConsumption,
          net: dayGeneration - dayConsumption,
          gridExport: dayGridExport,
          gridImport: dayGridImport,
        });
      }

      return chartData;
    } catch (error) {
      this.logger.error('Error getting energy chart data:', error);
      return [];
    }
  }
}
