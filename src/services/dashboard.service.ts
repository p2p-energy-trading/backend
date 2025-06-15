import { Injectable, Logger } from '@nestjs/common';
import { EnergyReadingsService } from '../graphql/EnergyReadings/EnergyReadings.service';
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
    private energyReadingsService: EnergyReadingsService,
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

      // Aggregate stats from all meters
      for (const meterId of meterIds) {
        const readings = await this.energyReadingsService.findAll({ meterId });

        for (const reading of readings) {
          const readingDate = new Date(reading.timestamp);
          const powerKw = reading.powerKw || 0;
          const isExport = reading.flowDirection === 'export';

          // Separate generation (export) and consumption (import) based on flow direction
          const exportKwh = isExport ? powerKw : 0;
          const importKwh = !isExport ? powerKw : 0;

          totalGeneration += exportKwh;
          totalConsumption += importKwh;

          if (readingDate >= today && readingDate < tomorrow) {
            todayGeneration += exportKwh;
            todayConsumption += importKwh;
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
          const heartbeats =
            await this.smartMetersService.findDeviceheartbeatsList(meterId);
          if (heartbeats && heartbeats.length > 0) {
            const latestHeartbeat = heartbeats.sort(
              (a: any, b: any) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            )[0] as { timestamp: string | Date };

            const heartbeatTime = new Date(latestHeartbeat.timestamp);
            const now = new Date();
            const timeDiff = now.getTime() - heartbeatTime.getTime();

            // Consider device online if heartbeat is within 5 minutes
            if (timeDiff < 5 * 60 * 1000) {
              onlineDevices++;
            }

            if (!lastHeartbeat || heartbeatTime > new Date(lastHeartbeat)) {
              lastHeartbeat = latestHeartbeat.timestamp.toString();
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

        for (const meterId of meterIds) {
          const readings = await this.energyReadingsService.findAll({
            meterId,
          });

          const dayReadings = readings.filter((reading) => {
            const readingDate = new Date(reading.timestamp);
            return readingDate >= dayStart && readingDate <= dayEnd;
          });

          dayGeneration += dayReadings.reduce((sum, reading) => {
            const powerKw = reading.powerKw || 0;
            const isExport = reading.flowDirection === 'export';
            return sum + (isExport ? powerKw : 0);
          }, 0);

          dayConsumption += dayReadings.reduce((sum, reading) => {
            const powerKw = reading.powerKw || 0;
            const isImport = reading.flowDirection === 'import';
            return sum + (isImport ? powerKw : 0);
          }, 0);
        }

        chartData.push({
          date: dayStart.toISOString().split('T')[0],
          generation: dayGeneration,
          consumption: dayConsumption,
          net: dayGeneration - dayConsumption,
        });
      }

      return chartData;
    } catch (error) {
      this.logger.error('Error getting energy chart data:', error);
      return [];
    }
  }
}
