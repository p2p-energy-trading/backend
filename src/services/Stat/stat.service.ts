import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { EnergySettlementsService } from '../../models/energySettlement/EnergySettlements.service';
import { MarketTradesService } from '../../models/marketTrade/MarketTrades.service';
import { SmartMetersService } from '../../models/SmartMeters/SmartMeters.service';
import { WalletsService } from '../../models/Wallets/Wallets.service';
import { BlockchainService } from '../Blockchain/blockchain.service';
import { EnergySettlementService } from '../Energy/energy-settlement.service';
import { EnergyAnalyticsService } from '../Energy/energy-analytics.service';
import { SmartMeterHealthService } from '../SmartMeter/smart-meter-health.service';
import { TradingAnalyticsService } from '../Trading/trading-analytics.service';
import { RedisTelemetryService } from '../Telemetry/redis-telemetry.service';
import { TelemetryAggregate } from '../../models/TelemetryAggregate/TelemetryAggregate.entity';

export interface StatStats {
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
export class StatService {
  private readonly logger = new Logger(StatService.name);

  constructor(
    @InjectRepository(TelemetryAggregate)
    private telemetryAggregateRepository: Repository<TelemetryAggregate>,
    private redisTelemetryService: RedisTelemetryService,
    private energySettlementsService: EnergySettlementsService,
    private marketTradesService: MarketTradesService,
    private smartMetersService: SmartMetersService,
    private walletsService: WalletsService,
    private energyAnalyticsService: EnergyAnalyticsService,
    private smartMeterHealthService: SmartMeterHealthService,
    private tradingAnalyticsService: TradingAnalyticsService,
    @Inject(forwardRef(() => BlockchainService))
    private blockchainService: BlockchainService,
    @Inject(forwardRef(() => EnergySettlementService))
    private energySettlementService: EnergySettlementService,
  ) {}

  async getStats(prosumerId: string): Promise<StatStats> {
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

      // Get today's data from Redis (latest real-time data)
      const todayPromises = meterIds.map((meterId) =>
        this.redisTelemetryService.getLatestData(meterId),
      );
      const todayData = await Promise.all(todayPromises);

      // Calculate today's stats from daily_energy fields
      let todayGeneration = 0;
      let todayConsumption = 0;
      let todayGridExport = 0;
      let todayGridImport = 0;

      for (const data of todayData) {
        if (data) {
          // Solar generation
          todayGeneration +=
            Number(data.data.solar_input?.daily_energy || 0) / 1000; // Convert Wh to kWh

          // Load consumption (home + smart meter)
          todayConsumption +=
            (Number(data.data.load_home?.daily_energy || 0) +
              Number(data.data.load_smart_mtr?.daily_energy || 0)) /
            1000;

          // Grid import/export
          todayGridExport += Number(data.data.export?.daily_energy || 0) / 1000;
          todayGridImport += Number(data.data.import?.daily_energy || 0) / 1000;
        }
      }

      // Get total (cumulative) stats from TelemetryAggregate
      const aggregates = await this.telemetryAggregateRepository
        .createQueryBuilder('agg')
        .select('SUM(agg.solarInputEnergyTotal)', 'totalGeneration')
        .addSelect(
          'SUM(agg.loadHomeEnergyTotal + agg.loadSmartEnergyTotal)',
          'totalConsumption',
        )
        .addSelect('SUM(agg.exportEnergyTotal)', 'totalGridExport')
        .addSelect('SUM(agg.importEnergyTotal)', 'totalGridImport')
        .where('agg.meterId IN (:...meterIds)', { meterIds })
        .getRawOne();

      const totalGeneration =
        Number(aggregates?.totalGeneration || 0) / 1000 + todayGeneration; // Add today's data
      const totalConsumption =
        Number(aggregates?.totalConsumption || 0) / 1000 + todayConsumption;
      const totalGridExport =
        Number(aggregates?.totalGridExport || 0) / 1000 + todayGridExport;
      const totalGridImport =
        Number(aggregates?.totalGridImport || 0) / 1000 + todayGridImport;

      return {
        todayGeneration,
        todayConsumption,
        totalGeneration,
        totalConsumption,
        netEnergy: totalGeneration - totalConsumption,
        todayGridExport,
        todayGridImport,
        totalGridExport,
        totalGridImport,
        netGridEnergy: totalGridExport - totalGridImport,
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

  /**
   * Get device status for dashboard stats
   * Now uses SmartMeterHealthService for consistency
   */
  private async getDeviceStatus(meterIds: string[]) {
    try {
      // Use SmartMeterHealthService to get aggregated status
      return await this.smartMeterHealthService.getDeviceStatus(meterIds);
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

      // Get all settlements for these meters
      const allSettlements: any[] = [];
      for (const meterId of meterIds) {
        try {
          const settlements = await this.energySettlementsService.findAll({
            meterId,
          });
          allSettlements.push(...settlements);
        } catch (error) {
          this.logger.warn(
            `Error getting settlements for meter ${meterId}:`,
            error,
          );
        }
      }

      const totalSettlements = allSettlements.length;
      const successfulSettlements = allSettlements.filter(
        (s) => s.status === 'SUCCESS',
      ).length;
      const pendingSettlements = allSettlements.filter(
        (s) => s.status === 'PENDING',
      ).length;

      // Today's settlements
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todaySettlements = allSettlements.filter(
        (s) => new Date(s.createdAtBackend) >= todayStart,
      ).length;

      // Find latest settlement time
      let lastSettlementTime: string | null = null;
      if (allSettlements.length > 0) {
        const latestSettlement = allSettlements.reduce((latest, current) =>
          new Date(current.createdAtBackend) > new Date(latest.createdAtBackend)
            ? current
            : latest,
        );
        lastSettlementTime = latestSettlement.createdAtBackend.toISOString
          ? latestSettlement.createdAtBackend.toISOString()
          : String(latestSettlement.createdAtBackend);
      }

      // Calculate total ETK minted and burned
      let totalEtkMinted = 0;
      let totalEtkBurned = 0;

      for (const settlement of allSettlements) {
        if (settlement.status === 'SUCCESS') {
          const etkAmount = Number(settlement.etkAmountCredited || 0);
          const netKwh = Number(settlement.netKwhFromGrid || 0);

          // If net is positive, energy was exported (ETK minted)
          // If net is negative, energy was imported (ETK burned)
          if (netKwh > 0) {
            totalEtkMinted += etkAmount;
          } else if (netKwh < 0) {
            totalEtkBurned += etkAmount;
          }
        }
      }

      return {
        totalSettlements,
        successfulSettlements,
        pendingSettlements,
        todaySettlements,
        lastSettlementTime,
        totalEtkMinted,
        totalEtkBurned,
      };
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

      // Get minimum settlement threshold from blockchain
      const minThreshold = await this.blockchainService.getMinSettlementWh();

      for (const device of devices) {
        const meterId = device.meterId;

        try {
          // Get latest settlement energy data from Redis
          const latestData =
            await this.redisTelemetryService.getLatestData(meterId);

          if (latestData && latestData.data) {
            const exportWh = Number(
              latestData.data.export?.settlement_energy || 0,
            );
            const importWh = Number(
              latestData.data.import?.settlement_energy || 0,
            );

            // Validate that we have valid numbers
            if (!isFinite(exportWh) || isNaN(exportWh)) {
              this.logger.warn(
                `Invalid export settlement_energy for meter ${meterId}: ${latestData.data.export?.settlement_energy}`,
              );
              continue;
            }

            if (!isFinite(importWh) || isNaN(importWh)) {
              this.logger.warn(
                `Invalid import settlement_energy for meter ${meterId}: ${latestData.data.import?.settlement_energy}`,
              );
              continue;
            }

            const netEnergyWh = exportWh - importWh;
            const absoluteNetEnergyWh = Math.abs(netEnergyWh);

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
                lastReadingTime: latestData.datetime,
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
                lastReadingTime: latestData.datetime,
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
