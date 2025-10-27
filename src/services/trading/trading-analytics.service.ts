import { Injectable, Logger } from '@nestjs/common';
import { MarketTradesService } from '../../models/marketTrade/marketTrade.service';
import { WalletsService } from '../../models/wallet/wallet.service';
import { TradeOrdersCacheRedisService } from './trade-orders-cache-redis.service';

/**
 * Service for trading analytics and performance metrics
 * Extracted from DashboardService to follow Single Responsibility Principle
 */
@Injectable()
export class TradingAnalyticsService {
  private readonly logger = new Logger(TradingAnalyticsService.name);

  constructor(
    private marketTradesService: MarketTradesService,
    private walletsService: WalletsService,
    private tradeOrdersCacheService: TradeOrdersCacheRedisService,
  ) {}

  /**
   * Get trading statistics for wallet addresses
   */
  async getTradingStats(walletAddresses: string[]) {
    try {
      if (walletAddresses.length === 0) {
        return this.getEmptyTradingStats();
      }

      // Get all trades
      const allTrades = await this.marketTradesService.findAll();

      // Filter trades for user's wallets (either as buyer or seller)
      const userTrades = allTrades.filter((trade: any) => {
        const buyerAddress = (trade as { buyerAddress?: string })?.buyerAddress;
        const sellerAddress = (trade as { sellerAddress?: string })
          ?.sellerAddress;
        return (
          (buyerAddress && walletAddresses.includes(buyerAddress)) ||
          (sellerAddress && walletAddresses.includes(sellerAddress))
        );
      });

      // Calculate statistics
      const totalTrades = userTrades.length;
      let totalVolume = 0;
      let totalPriceSum = 0;
      let totalEarnings = 0;
      let totalSpending = 0;

      // Get timestamp 24 hours ago
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      let last24hVolume = 0;

      for (const trade of userTrades) {
        const amount = Number(
          (trade as { etkAmount?: number })?.etkAmount || 0,
        );
        const price = Number(
          (trade as { pricePerEtk?: number })?.pricePerEtk || 0,
        );
        const totalPrice = amount * price;
        const buyerAddress = (trade as { buyerAddress?: string })?.buyerAddress;
        const timestamp = (trade as { timestamp?: string | Date })?.timestamp;

        totalVolume += amount;
        totalPriceSum += price;

        // Check if user is buyer or seller
        if (buyerAddress && walletAddresses.includes(buyerAddress)) {
          // User bought ETK, spent IDRS
          totalSpending += totalPrice;
        } else {
          // User sold ETK, earned IDRS
          totalEarnings += totalPrice;
        }

        // Calculate 24h volume
        if (timestamp) {
          const tradeDate = new Date(timestamp);
          if (tradeDate >= twentyFourHoursAgo) {
            last24hVolume += amount;
          }
        }
      }

      const averagePrice = totalTrades > 0 ? totalPriceSum / totalTrades : 0;
      const netProfit = totalEarnings - totalSpending;

      return {
        totalTrades,
        totalVolume: Math.round(totalVolume * 1000) / 1000,
        averagePrice: Math.round(averagePrice * 100) / 100,
        last24hVolume: Math.round(last24hVolume * 1000) / 1000,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalSpending: Math.round(totalSpending * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Error getting trading stats:', error);
      return this.getEmptyTradingStats();
    }
  }

  /**
   * Get detailed trading performance for a prosumer
   */
  async getTradingPerformance(prosumerId: string, days: number = 30) {
    try {
      // Get prosumer's wallets
      const wallets = await this.walletsService.findAll({ prosumerId });
      const walletAddresses = wallets.map(
        (w: { walletAddress: string }) => w.walletAddress,
      );

      if (walletAddresses.length === 0) {
        return this.getEmptyPerformance();
      }

      // Get trading stats
      const stats = await this.getTradingStats(walletAddresses);

      // Get balances
      const primaryWallet =
        wallets.find(
          (w: any) => (w as { isPrimary?: boolean })?.isPrimary === true,
        ) || wallets[0];

      const etkBalance = Number(
        (primaryWallet as { etkBalance?: number })?.etkBalance || 0,
      );
      const idrsBalance = Number(
        (primaryWallet as { idrsBalance?: number })?.idrsBalance || 0,
      );

      // Calculate profit margin
      const profitMargin =
        stats.totalEarnings > 0
          ? Math.round((stats.netProfit / stats.totalEarnings) * 100)
          : 0;

      return {
        period: `${days} days`,
        summary: {
          totalTrades: stats.totalTrades,
          totalVolume: stats.totalVolume.toString(),
          averagePrice: stats.averagePrice.toString(),
          last24hVolume: stats.last24hVolume.toString(),
        },
        financial: {
          totalEarnings: stats.totalEarnings.toString(),
          totalSpending: stats.totalSpending.toString(),
          netProfit: stats.netProfit.toString(),
          profitMargin,
        },
        balances: {
          etkBalance: etkBalance.toString(),
          idrsBalance: idrsBalance.toString(),
        },
      };
    } catch (error) {
      this.logger.error('Error getting trading performance:', error);
      return this.getEmptyPerformance();
    }
  }

  /**
   * Get trading metrics for analytics
   */
  async getTradingMetrics(prosumerId: string) {
    try {
      // Get prosumer's wallets
      const wallets = await this.walletsService.findAll({ prosumerId });
      const walletAddresses = wallets.map(
        (w: { walletAddress: string }) => w.walletAddress,
      );

      if (walletAddresses.length === 0) {
        return this.getEmptyMetrics();
      }

      // Get all trades
      const allTrades = await this.marketTradesService.findAll();
      const userTrades = allTrades.filter((trade: any) => {
        const buyerAddress = (trade as { buyerAddress?: string })?.buyerAddress;
        const sellerAddress = (trade as { sellerAddress?: string })
          ?.sellerAddress;
        return (
          (buyerAddress && walletAddresses.includes(buyerAddress)) ||
          (sellerAddress && walletAddresses.includes(sellerAddress))
        );
      });

      // Get open orders
      const allOrders = await this.tradeOrdersCacheService.findAll();
      const userOrders = allOrders.filter((order: any) => {
        const walletAddress = (order as { walletAddress?: string })
          ?.walletAddress;
        const status = (order as { status?: string })?.status;
        return (
          walletAddress &&
          walletAddresses.includes(walletAddress) &&
          status === 'OPEN'
        );
      });

      // Calculate buy/sell breakdown
      let buyTrades = 0;
      let sellTrades = 0;
      let buyVolume = 0;
      let sellVolume = 0;

      for (const trade of userTrades) {
        const buyerAddress = (trade as { buyerAddress?: string })?.buyerAddress;
        const amount = Number(
          (trade as { etkAmount?: number })?.etkAmount || 0,
        );

        if (buyerAddress && walletAddresses.includes(buyerAddress)) {
          buyTrades++;
          buyVolume += amount;
        } else {
          sellTrades++;
          sellVolume += amount;
        }
      }

      // Calculate order breakdown
      let bidOrders = 0;
      let askOrders = 0;

      for (const order of userOrders) {
        const orderType = (order as { orderType?: string })?.orderType;
        if (orderType === 'BID') {
          bidOrders++;
        } else if (orderType === 'ASK') {
          askOrders++;
        }
      }

      return {
        trades: {
          total: userTrades.length,
          buy: buyTrades,
          sell: sellTrades,
          buyVolume: Math.round(buyVolume * 1000) / 1000,
          sellVolume: Math.round(sellVolume * 1000) / 1000,
        },
        orders: {
          total: userOrders.length,
          bid: bidOrders,
          ask: askOrders,
        },
      };
    } catch (error) {
      this.logger.error('Error getting trading metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get trade analytics with period breakdown
   */
  async getTradeAnalytics(
    prosumerId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
  ) {
    try {
      // Get prosumer's wallets
      const wallets = await this.walletsService.findAll({ prosumerId });
      const walletAddresses = wallets.map(
        (w: { walletAddress: string }) => w.walletAddress,
      );

      if (walletAddresses.length === 0) {
        return this.getEmptyAnalytics(period);
      }

      // Calculate period days
      const periodDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
      const periodStart = new Date(
        Date.now() - periodDays * 24 * 60 * 60 * 1000,
      );

      // Get all trades
      const allTrades = await this.marketTradesService.findAll();
      const userTrades = allTrades.filter((trade: any) => {
        const buyerAddress = (trade as { buyerAddress?: string })?.buyerAddress;
        const sellerAddress = (trade as { sellerAddress?: string })
          ?.sellerAddress;
        const timestamp = (trade as { timestamp?: string | Date })?.timestamp;

        const inPeriod = timestamp && new Date(timestamp) >= periodStart;
        const isUserTrade =
          (buyerAddress && walletAddresses.includes(buyerAddress)) ||
          (sellerAddress && walletAddresses.includes(sellerAddress));

        return inPeriod && isUserTrade;
      });

      // Calculate stats for period
      let totalVolume = 0;
      let totalValue = 0;
      let highestPrice = 0;
      let lowestPrice = Number.MAX_VALUE;
      let priceSum = 0;

      for (const trade of userTrades) {
        const amount = Number(
          (trade as { etkAmount?: number })?.etkAmount || 0,
        );
        const price = Number(
          (trade as { pricePerEtk?: number })?.pricePerEtk || 0,
        );

        totalVolume += amount;
        totalValue += amount * price;
        priceSum += price;

        if (price > highestPrice) highestPrice = price;
        if (price < lowestPrice) lowestPrice = price;
      }

      const averagePrice =
        userTrades.length > 0 ? priceSum / userTrades.length : 0;

      return {
        period,
        periodDays,
        trades: userTrades.length,
        volume: Math.round(totalVolume * 1000) / 1000,
        value: Math.round(totalValue * 100) / 100,
        averagePrice: Math.round(averagePrice * 100) / 100,
        highestPrice:
          userTrades.length > 0 ? Math.round(highestPrice * 100) / 100 : 0,
        lowestPrice:
          userTrades.length > 0 ? Math.round(lowestPrice * 100) / 100 : 0,
      };
    } catch (error) {
      this.logger.error('Error getting trade analytics:', error);
      return this.getEmptyAnalytics(period);
    }
  }

  // Helper methods for empty states
  private getEmptyTradingStats() {
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

  private getEmptyPerformance() {
    return {
      period: '30 days',
      summary: {
        totalTrades: 0,
        totalVolume: '0',
        averagePrice: '0',
        last24hVolume: '0',
      },
      financial: {
        totalEarnings: '0',
        totalSpending: '0',
        netProfit: '0',
        profitMargin: 0,
      },
      balances: {
        etkBalance: '0',
        idrsBalance: '0',
      },
    };
  }

  private getEmptyMetrics() {
    return {
      trades: {
        total: 0,
        buy: 0,
        sell: 0,
        buyVolume: 0,
        sellVolume: 0,
      },
      orders: {
        total: 0,
        bid: 0,
        ask: 0,
      },
    };
  }

  private getEmptyAnalytics(period: string) {
    return {
      period,
      periodDays: period === 'daily' ? 1 : period === 'weekly' ? 7 : 30,
      trades: 0,
      volume: 0,
      value: 0,
      averagePrice: 0,
      highestPrice: 0,
      lowestPrice: 0,
    };
  }
}
