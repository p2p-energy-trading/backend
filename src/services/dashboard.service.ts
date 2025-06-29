import { Injectable, Logger } from '@nestjs/common';
import { EnergyReadingsDetailedService } from '../modules/EnergyReadingsDetailed/EnergyReadingsDetailed.service';
import { EnergySettlementsService } from '../modules/EnergySettlements/EnergySettlements.service';
import { MarketTradesService } from '../modules/MarketTrades/MarketTrades.service';
import { SmartMetersService } from '../modules/SmartMeters/SmartMeters.service';
import { WalletsService } from '../modules/Wallets/Wallets.service';
import { DeviceStatusSnapshotsService } from '../modules/DeviceStatusSnapshots/DeviceStatusSnapshots.service';
import { BlockchainService } from './blockchain.service';
import { EnergySettlementService } from './energy-settlement.service';

export interface DashboardStats {
  energyStats: {
    todayGeneration: number;
    todayConsumption: number;
    totalGeneration: number;
    totalConsumption: number;
    netEnergy: number;
    // Enhanced grid statistics
    todayGridExport: number;
    todayGridImport: number;
    totalGridExport: number;
    totalGridImport: number;
    netGridEnergy: number;
  };
  tradingStats: {
    totalTrades: number;
    totalVolume: number;
    averagePrice: number;
    last24hVolume: number;
    // Enhanced trading metrics
    totalEarnings: number;
    totalSpending: number;
    netProfit: number;
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
    // Enhanced device metrics
    authorizedDevices: number;
    settlementsToday: number;
    averageUptime: number;
  };
  settlementStats: {
    totalSettlements: number;
    successfulSettlements: number;
    pendingSettlements: number;
    todaySettlements: number;
    lastSettlementTime: string | null;
    totalEtkMinted: number;
    totalEtkBurned: number;
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
    private deviceStatusSnapshotsService: DeviceStatusSnapshotsService,
    private blockchainService: BlockchainService,
    private energySettlementService: EnergySettlementService,
  ) {}

  async getDashboardStats(prosumerId: string): Promise<DashboardStats> {
    try {
      // Get prosumer's devices and wallets
      const [devices, wallets] = await Promise.all([
        this.getProsumeDevices(prosumerId),
        this.walletsService.findAll({ prosumerId }),
      ]);

      // Parallel fetch all stats including settlement stats
      const [
        energyStats,
        tradingStats,
        balances,
        deviceStatus,
        settlementStats,
      ] = await Promise.all([
        this.getEnergyStats(devices.map((d) => d.meterId)),
        this.getTradingStats(wallets.map((w) => w.walletAddress)),
        this.getBalances(wallets[0]?.walletAddress),
        this.getDeviceStatus(devices.map((d) => d.meterId)),
        this.getSettlementStats(devices.map((d) => d.meterId)),
      ]);

      return {
        energyStats,
        tradingStats,
        balances,
        deviceStatus,
        settlementStats,
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
          todayGridExport: 0,
          todayGridImport: 0,
          totalGridExport: 0,
          totalGridImport: 0,
          netGridEnergy: 0,
        };
      }

      // Use the new optimized method that leverages cumulative data
      const { todayStats, totalStats } =
        await this.energyReadingsDetailedService.findLatestEnergyStatsForDashboard(
          meterIds,
        );

      return {
        todayGeneration: todayStats.generation,
        todayConsumption: todayStats.consumption,
        totalGeneration: totalStats.generation,
        totalConsumption: totalStats.consumption,
        netEnergy: totalStats.generation - totalStats.consumption,
        todayGridExport: todayStats.gridExport,
        todayGridImport: todayStats.gridImport,
        totalGridExport: totalStats.gridExport,
        totalGridImport: totalStats.gridImport,
        netGridEnergy: totalStats.gridExport - totalStats.gridImport,
      };
    } catch (error) {
      this.logger.error('Error getting energy stats:', error);
      return {
        todayGeneration: 0,
        todayConsumption: 0,
        totalGeneration: 0,
        totalConsumption: 0,
        netEnergy: 0,
        todayGridExport: 0,
        todayGridImport: 0,
        totalGridExport: 0,
        totalGridImport: 0,
        netGridEnergy: 0,
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
          totalEarnings: 0,
          totalSpending: 0,
          netProfit: 0,
        };
      }

      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const allTrades: unknown[] = [];

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

      // Helper function to check if an object is a valid trade
      const isValidTrade = (
        trade: unknown,
      ): trade is {
        tradeId: unknown;
        tradedEtkAmount: unknown;
        priceIdrsPerEtk: unknown;
        tradeTimestamp: unknown;
        buyerWalletAddress: unknown;
        sellerWalletAddress: unknown;
      } => {
        return Boolean(
          trade &&
            typeof trade === 'object' &&
            'tradeId' in trade &&
            'tradedEtkAmount' in trade &&
            'priceIdrsPerEtk' in trade &&
            'tradeTimestamp' in trade &&
            'buyerWalletAddress' in trade &&
            'sellerWalletAddress' in trade,
        );
      };

      // Remove duplicates
      const uniqueTrades = allTrades
        .filter(
          (trade, index, self) =>
            isValidTrade(trade) &&
            index ===
              self.findIndex(
                (t: unknown) => isValidTrade(t) && t.tradeId === trade.tradeId,
              ),
        )
        .filter(isValidTrade);

      const totalTrades = uniqueTrades.length;
      const totalVolume = uniqueTrades.reduce((sum: number, trade) => {
        const tradedAmount = Number(trade.tradedEtkAmount) || 0;
        return sum + tradedAmount;
      }, 0);

      const averagePrice =
        totalTrades > 0
          ? uniqueTrades.reduce(
              (sum, trade) => sum + (Number(trade.priceIdrsPerEtk) || 0),
              0,
            ) / totalTrades
          : 0;

      const last24hTrades = uniqueTrades.filter(
        (trade) => new Date(String(trade.tradeTimestamp)) > last24Hours,
      );
      const last24hVolume = last24hTrades.reduce(
        (sum, trade) => sum + (Number(trade.tradedEtkAmount) || 0),
        0,
      );

      // Calculate earnings and spending based on trade roles
      let totalEarnings = 0;
      let totalSpending = 0;

      for (const trade of uniqueTrades) {
        const tradeValue =
          (Number(trade.tradedEtkAmount) || 0) *
          (Number(trade.priceIdrsPerEtk) || 0);

        // Check if this wallet was buyer or seller
        const isBuyer = walletAddresses.includes(
          String(trade.buyerWalletAddress),
        );
        const isSeller = walletAddresses.includes(
          String(trade.sellerWalletAddress),
        );

        if (isSeller) {
          // When selling ETK, we earn IDRS
          totalEarnings += tradeValue;
        }
        if (isBuyer) {
          // When buying ETK, we spend IDRS
          totalSpending += tradeValue;
        }
      }

      return {
        totalTrades,
        totalVolume,
        averagePrice,
        last24hVolume,
        totalEarnings,
        totalSpending,
        netProfit: totalEarnings - totalSpending,
      };
    } catch (error) {
      this.logger.error('Error getting trading stats:', error);
      return {
        totalTrades: 0,
        totalVolume: 0,
        averagePrice: 0,
        last24hVolume: 0,
        totalEarnings: 0,
        totalSpending: 0,
        netProfit: 0,
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

      // Use the new optimized method for device status
      const deviceStats =
        await this.energyReadingsDetailedService.findDeviceStatusStatsForDashboard(
          meterIds,
        );

      // For authorized devices, we still need to check blockchain individually (this is expensive but necessary)
      // TODO: This could be optimized with a batch blockchain call if the service supports it
      let authorizedDevices = 0;
      try {
        const authorizationPromises = meterIds.map(async (meterId) => {
          try {
            return await this.blockchainService.isMeterIdAuthorized(meterId);
          } catch {
            return false;
          }
        });
        const authResults = await Promise.all(authorizationPromises);
        authorizedDevices = authResults.filter(Boolean).length;
      } catch (error) {
        this.logger.warn('Error checking meter authorizations:', error);
      }

      return {
        totalDevices: deviceStats.totalDevices,
        onlineDevices: deviceStats.onlineDevices,
        lastHeartbeat: deviceStats.lastHeartbeat,
        authorizedDevices,
        settlementsToday: deviceStats.settlementsToday,
        averageUptime: 0, // TODO: Implement if needed
      };
    } catch (error) {
      this.logger.error('Error getting device status:', error);
      return {
        totalDevices: 0,
        onlineDevices: 0,
        lastHeartbeat: null,
        authorizedDevices: 0,
        settlementsToday: 0,
        averageUptime: 0,
      };
    }
  }

  private async getSettlementStats(meterIds: string[]) {
    try {
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

      // Use the new optimized method for settlement stats
      const settlementStats =
        await this.energyReadingsDetailedService.findSettlementStatsForDashboard(
          meterIds,
        );

      return settlementStats;
    } catch (error) {
      this.logger.error('Error getting settlement stats:', error);
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

      // Use the ultra-fast optimized method that returns chart-ready data
      const chartData =
        await this.energyReadingsDetailedService.findDailyEnergyTotalsForChart(
          meterIds,
          startDate,
          endDate,
        );

      // Data is already in the correct format and sorted by date
      return chartData;
    } catch (error) {
      this.logger.error('Error getting energy chart data:', error);
      return [];
    }
  }

  // Enhanced method to get real-time energy and settlement data
  async getRealTimeEnergyData(prosumerId: string) {
    try {
      const devices = await this.getProsumeDevices(prosumerId);
      const meterIds = devices.map((d) => d.meterId);

      this.logger.debug(
        `Fetching real-time energy data for prosumer ${prosumerId} with meters: ${meterIds.join(', ')}`,
      );

      if (meterIds.length === 0) {
        return {
          lastUpdate: null,
          timeSeries: [],
        };
      }

      // Use optimized bulk queries to eliminate N+1 query problem
      const [latestReadingsMap, timeSeriesMap] = await Promise.all([
        // Get latest complete sets for all meters in one query
        this.energyReadingsDetailedService.findLatestCompleteSetsForMeters(
          meterIds,
        ),
        // Get time series data for all meters efficiently
        meterIds.length === 1
          ? Promise.resolve(new Map()) // Will use single-meter optimization below
          : this.energyReadingsDetailedService.findTimeSeriesForMultipleMeters(
              meterIds,
              20,
            ), // Reduced per-meter limit
      ]);

      let lastUpdate: string | null = null;

      // Process latest readings from all meters
      for (const meterId of meterIds) {
        const latestReadings = latestReadingsMap.get(meterId) || [];

        this.logger.debug(
          `Found ${latestReadings.length} readings in latest complete set for meter ${meterId}`,
        );

        if (latestReadings.length > 0) {
          // Update lastUpdate from the latest timestamp
          const latestTimestamp = latestReadings[0].timestamp.toISOString();
          if (!lastUpdate || latestTimestamp > lastUpdate) {
            lastUpdate = latestTimestamp;
          }
        }
      }

      // Get time series data efficiently
      let timeSeries: any[] = [];
      if (meterIds.length > 0) {
        if (meterIds.length === 1) {
          // Single meter: use existing optimized query
          const meterTimeSeries =
            await this.energyReadingsDetailedService.findTimeSeriesPowerDataOptimized(
              meterIds[0],
              20, // Full 20 data points for single meter
            );

          timeSeries = meterTimeSeries.map((point) => ({
            timestamp: point.timestamp,
            solar: point.solar / 1000, // Convert W to kW
            load: point.load / 1000, // Convert W to kW
            battery: point.battery / 1000, // Convert W to kW
            batteryDirection: point.battery > 0 ? 'discharging' : 'charging',
            gridExport: point.gridExport / 1000, // Convert W to kW
            gridImport: point.gridImport / 1000, // Convert W to kW
            netFlow: (point.gridExport - point.gridImport) / 1000, // Convert W to kW
            meterId: meterIds[0],
          }));
        } else {
          // Multiple meters: merge the pre-fetched time series data
          interface TimeSeriesPoint {
            timestamp: string;
            solar: number;
            load: number;
            battery: number;
            gridExport: number;
            gridImport: number;
            meterId: string;
          }

          interface RawTimeSeriesPoint {
            timestamp: unknown;
            solar: unknown;
            load: unknown;
            battery: unknown;
            gridExport: unknown;
            gridImport: unknown;
          }

          const allTimeSeries: TimeSeriesPoint[] = [];

          for (const [meterId, meterTimeSeries] of timeSeriesMap) {
            const convertedTimeSeries: TimeSeriesPoint[] = (
              meterTimeSeries as RawTimeSeriesPoint[]
            ).map((point: RawTimeSeriesPoint) => {
              let timestampStr = '';
              try {
                if (point?.timestamp instanceof Date) {
                  timestampStr = point.timestamp.toISOString();
                } else if (typeof point?.timestamp === 'string') {
                  timestampStr = point.timestamp;
                } else if (point?.timestamp != null) {
                  // Try to parse as Date
                  const date = new Date(point.timestamp as string | number);
                  timestampStr = isNaN(date.getTime())
                    ? ''
                    : date.toISOString();
                }
              } catch {
                timestampStr = '';
              }

              return {
                timestamp: timestampStr,
                solar: Number(point?.solar ?? 0) / 1000,
                load: Number(point?.load ?? 0) / 1000,
                battery: Number(point?.battery ?? 0) / 1000,
                gridExport: Number(point?.gridExport ?? 0) / 1000,
                gridImport: Number(point?.gridImport ?? 0) / 1000,
                meterId: String(meterId),
              };
            });
            allTimeSeries.push(...convertedTimeSeries);
          }

          // Sort by timestamp and take only the 20 most recent points
          timeSeries = allTimeSeries
            .sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            )
            .slice(0, 20);
        }
      }

      return {
        lastUpdate,
        timeSeries,
      };
    } catch (error) {
      this.logger.error('Error getting real-time energy data:', error);
      return {
        lastUpdate: null,
        timeSeries: [],
      };
    }
  }

  // Enhanced method to get settlement recommendations
  async getSettlementRecommendations(prosumerId: string) {
    try {
      const devices = await this.getProsumeDevices(prosumerId);
      const recommendations: Array<{
        meterId: string;
        netEnergyWh: number;
        netEnergyKwh: number;
        operationType: string;
        estimatedEtkAmount: number;
        readyForSettlement: boolean;
        lastReadingTime?: string;
        reason?: string;
      }> = [];

      for (const device of devices) {
        const meterId = device.meterId;

        // Check if settlement is recommended
        try {
          // Get latest energy readings to calculate net energy
          const recentReadings =
            await this.energyReadingsDetailedService.findAll({
              meterId,
            });

          if (recentReadings.length > 0) {
            // Get the most recent timestamp
            const latestTimestamp = Math.max(
              ...recentReadings.map((r: any) => {
                const timestamp =
                  r && typeof r === 'object' && 'timestamp' in r
                    ? (r as { timestamp: unknown }).timestamp
                    : null;
                if (timestamp instanceof Date) return timestamp.getTime();
                if (typeof timestamp === 'string')
                  return new Date(timestamp).getTime();
                if (typeof timestamp === 'number') return timestamp;
                return 0;
              }),
            );

            const latestReadings = recentReadings.filter((r: any) => {
              const timestamp =
                r && typeof r === 'object' && 'timestamp' in r
                  ? (r as { timestamp: unknown }).timestamp
                  : null;
              let timestampValue: number;
              if (timestamp instanceof Date)
                timestampValue = timestamp.getTime();
              else if (typeof timestamp === 'string')
                timestampValue = new Date(timestamp).getTime();
              else if (typeof timestamp === 'number')
                timestampValue = timestamp;
              else return false;
              return timestampValue === latestTimestamp;
            });

            // Calculate net energy from settlement readings
            let exportWh = 0;
            let importWh = 0;

            for (const reading of latestReadings) {
              const settlementEnergy =
                Number(
                  reading &&
                    typeof reading === 'object' &&
                    'settlementEnergyWh' in reading
                    ? reading.settlementEnergyWh
                    : 0,
                ) || 0;
              const subsystem =
                reading && typeof reading === 'object' && 'subsystem' in reading
                  ? reading.subsystem
                  : null;

              if (subsystem === 'GRID_EXPORT') {
                exportWh += settlementEnergy;
              } else if (subsystem === 'GRID_IMPORT') {
                importWh += settlementEnergy;
              }
            }

            const netEnergyWh = exportWh - importWh;
            const absoluteNetEnergyWh = Math.abs(netEnergyWh);

            const minThreshold =
              await this.blockchainService.getMinSettlementWh();

            if (absoluteNetEnergyWh >= minThreshold) {
              const operationType = netEnergyWh >= 0 ? 'EXPORT' : 'IMPORT';
              const etkAmount =
                await this.blockchainService.calculateEtkAmount(
                  absoluteNetEnergyWh,
                );

              recommendations.push({
                meterId,
                netEnergyWh,
                netEnergyKwh: netEnergyWh / 1000,
                operationType,
                estimatedEtkAmount: etkAmount,
                readyForSettlement: true,
                lastReadingTime: new Date(latestTimestamp).toISOString(),
              });
            } else {
              recommendations.push({
                meterId,
                netEnergyWh,
                netEnergyKwh: netEnergyWh / 1000,
                operationType: netEnergyWh >= 0 ? 'EXPORT' : 'IMPORT',
                estimatedEtkAmount: 0,
                readyForSettlement: false,
                reason: `Below minimum threshold (${minThreshold} Wh)`,
                lastReadingTime: new Date(latestTimestamp).toISOString(),
              });
            }
          } else {
            recommendations.push({
              meterId,
              netEnergyWh: 0,
              netEnergyKwh: 0,
              operationType: 'NONE',
              estimatedEtkAmount: 0,
              readyForSettlement: false,
              reason: 'No energy readings available',
            });
          }
        } catch (error) {
          this.logger.warn(
            `Error getting settlement recommendation for meter ${meterId}:`,
            error,
          );
          recommendations.push({
            meterId,
            netEnergyWh: 0,
            netEnergyKwh: 0,
            operationType: 'ERROR',
            estimatedEtkAmount: 0,
            readyForSettlement: false,
            reason: 'Error fetching data',
          });
        }
      }

      return recommendations;
    } catch (error) {
      this.logger.error('Error getting settlement recommendations:', error);
      return [];
    }
  }

  // Enhanced method to get blockchain synchronization status
  async getBlockchainSyncStatus(prosumerId: string) {
    try {
      const devices = await this.getProsumeDevices(prosumerId);
      const wallets = await this.walletsService.findAll({ prosumerId });

      if (wallets.length === 0) {
        return {
          walletConnected: false,
          devicesAuthorized: 0,
          totalDevices: devices.length,
          pendingTransactions: 0,
          lastBlockchainActivity: null,
        };
      }

      const walletAddress = wallets[0].walletAddress;
      let devicesAuthorized = 0;
      let pendingTransactions = 0;
      let lastBlockchainActivity: string | null = null;

      // Check device authorization status
      for (const device of devices) {
        try {
          const isAuthorized = await this.blockchainService.isMeterIdAuthorized(
            device.meterId,
          );
          if (isAuthorized) {
            devicesAuthorized++;
          }
        } catch (error) {
          this.logger.warn(
            `Error checking authorization for ${device.meterId}:`,
            error,
          );
        }
      }

      // Check pending settlements
      for (const device of devices) {
        try {
          const settlements = await this.energySettlementsService.findAll({
            meterId: device.meterId,
          });

          const pending = settlements.filter(
            (s: any) =>
              s &&
              typeof s === 'object' &&
              'status' in s &&
              (s as { status: unknown }).status === 'PENDING',
          );
          pendingTransactions += pending.length;

          // Find latest blockchain activity
          for (const settlement of settlements) {
            if (settlement.confirmedAtOnChain) {
              const activityTime = new Date(settlement.confirmedAtOnChain);
              if (
                !lastBlockchainActivity ||
                activityTime > new Date(lastBlockchainActivity)
              ) {
                lastBlockchainActivity =
                  settlement.confirmedAtOnChain instanceof Date
                    ? settlement.confirmedAtOnChain.toISOString()
                    : settlement.confirmedAtOnChain;
              }
            }
          }
        } catch (error) {
          this.logger.warn(
            `Error checking pending transactions for ${device.meterId}:`,
            error,
          );
        }
      }

      return {
        walletConnected: true,
        walletAddress,
        devicesAuthorized,
        totalDevices: devices.length,
        pendingTransactions,
        lastBlockchainActivity,
        authorizationRate:
          devices.length > 0 ? (devicesAuthorized / devices.length) * 100 : 0,
      };
    } catch (error) {
      this.logger.error('Error getting blockchain sync status:', error);
      return {
        walletConnected: false,
        devicesAuthorized: 0,
        totalDevices: 0,
        pendingTransactions: 0,
        lastBlockchainActivity: null,
        authorizationRate: 0,
      };
    }
  }
}
