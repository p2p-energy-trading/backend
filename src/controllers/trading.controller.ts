import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Query,
  Logger,
  Param,
} from '@nestjs/common';
import { BlockchainService } from '../services/blockchain.service';
import { EnergySettlementService } from '../services/energy-settlement.service';
import { WalletsService } from '../modules/Wallets/Wallets.service';
import { TradeOrdersCacheService } from '../modules/TradeOrdersCache/TradeOrdersCache.service';
import { MarketTradesService } from '../modules/MarketTrades/MarketTrades.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { ProsumersService } from 'src/modules/Prosumers/Prosumers.service';
import { PriceCacheService } from '../services/price-cache.service';

interface User extends Request {
  user: {
    prosumerId: string;
  };
}

interface PlaceOrderRequest {
  walletAddress: string;
  orderType: 'BID' | 'ASK';
  quantity: number;
  price: number;
}

@Controller('trading')
@UseGuards(JwtAuthGuard)
export class TradingController {
  private readonly logger = new Logger(TradingController.name);

  constructor(
    private blockchainService: BlockchainService,
    private energySettlementService: EnergySettlementService,
    private walletsService: WalletsService,
    private tradeOrdersCacheService: TradeOrdersCacheService,
    private marketTradesService: MarketTradesService,
    private prosumersService: ProsumersService,
    private priceCacheService: PriceCacheService,
  ) {}

  @Post('order')
  async placeOrder(@Body() body: PlaceOrderRequest, @Request() req: User) {
    const prosumerId = req.user.prosumerId;

    // Verify wallet ownership
    await this.verifyWalletOwnership(body.walletAddress, prosumerId);

    // Check if user has sufficient balance before placing order
    await this.checkSufficientBalance(body);

    let txHash: string;
    if (body.orderType === 'BID') {
      txHash = await this.blockchainService.placeBuyOrder(
        body.walletAddress,
        body.quantity,
        body.price,
      );
    } else {
      txHash = await this.blockchainService.placeSellOrder(
        body.walletAddress,
        body.quantity,
        body.price,
      );
    }

    return {
      success: true,
      transactionHash: txHash,
      message: `${body.orderType} order placed`,
    };
  }

  @Get('orders')
  async getOrders(
    @Request() req: User,
    @Query('status') status?: string,
    @Query('scope') scope?: 'own' | 'public' | 'all',
    @Query('limit') limit?: string,
  ) {
    const prosumerId = req.user.prosumerId;
    const validScope = scope || 'own'; // Default to 'own' if not specified
    const maxLimit = limit ? parseInt(limit) : 50; // Default limit to 50

    try {
      // Validate scope parameter
      if (!['own', 'public', 'all'].includes(validScope)) {
        throw new BadRequestException(
          'Invalid scope parameter. Must be one of: own, public, all',
        );
      }

      // Log admin scope access
      if (validScope === 'all') {
        this.logger.warn(`User ${prosumerId} requested 'all' scope for orders`);
      }

      let allOrders: any[] = [];

      if (validScope === 'own') {
        // Get user's own orders only
        const wallets = await this.walletsService.findAll({ prosumerId });
        const walletAddresses = wallets.map((w) => w.walletAddress);

        // Get orders for all user's wallets
        for (const walletAddress of walletAddresses) {
          const orders = await this.tradeOrdersCacheService.findAll({
            walletAddress: walletAddress,
          });
          allOrders.push(...orders);
        }
      } else if (validScope === 'public') {
        // Get all orders with anonymized data
        const orders = await this.tradeOrdersCacheService.findAll({});

        // Anonymize sensitive data for public view
        allOrders = orders.map((order: any) => ({
          ...order,
          // Anonymize sensitive information
          walletAddress: order.walletAddress
            ? order.walletAddress.substring(0, 10) + '...'
            : null,
          prosumerId: order.prosumerId
            ? order.prosumerId.substring(0, 8) + '...'
            : null,
          blockchainTxHash: order.blockchainTxHash
            ? order.blockchainTxHash.substring(0, 12) + '...'
            : null,
        }));
      } else {
        // Get all orders with full data (admin/debug)
        allOrders = await this.tradeOrdersCacheService.findAll({});
      }

      // Filter by status if provided
      let filteredOrders = allOrders;
      if (status) {
        filteredOrders = allOrders.filter(
          (order: any) => order.statusOnChain === status,
        );
      }

      // Sort by creation date and apply limit
      const sortedOrders = filteredOrders
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAtOnChain as string).getTime() -
            new Date(a.createdAtOnChain as string).getTime(),
        )
        .slice(0, maxLimit);

      return {
        success: true,
        data: sortedOrders,
        metadata: {
          scope: validScope,
          prosumerId: validScope === 'own' ? prosumerId : 'multiple',
          status: status || 'all',
          limit: maxLimit,
          count: sortedOrders.length,
        },
        message: `Orders retrieved successfully (${validScope} scope)`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error getting orders:', error);
      throw new BadRequestException('Failed to retrieve orders');
    }
  }

  @Get('orderbook-detailed')
  async getOrderBookDetailed() {
    const allOrders =
      await this.tradeOrdersCacheService.findOpenOrPartiallyFilledOrders();

    const buyOrders = allOrders
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .filter((order: any) => order.orderType === 'BID')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .sort((a: any, b: any) => b.priceIdrsPerEtk - a.priceIdrsPerEtk); // Highest price first for buy orders

    const sellOrders = allOrders
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .filter((order: any) => order.orderType === 'ASK')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .sort((a: any, b: any) => a.priceIdrsPerEtk - b.priceIdrsPerEtk); // Lowest price first for sell orders

    return {
      success: true,
      data: {
        buyOrders: buyOrders.slice(0, 20), // Top 20 buy orders
        sellOrders: sellOrders.slice(0, 20), // Top 20 sell orders
      },
    };
  }

  @Get('orderbook')
  async getOrderBook() {
    const allOrders =
      await this.tradeOrdersCacheService.findOpenOrPartiallyFilledOrders();

    // Group buy orders by price and sum quantities
    const buyOrdersMap = allOrders
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .filter((order: any) => order.orderType === 'BID')
      .reduce(
        (acc, order: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const price = Number(order.priceIdrsPerEtk);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const quantity = Number(order.amountEtk);
          acc[price] = (acc[price] || 0) + quantity;
          return acc;
        },
        {} as Record<number, number>,
      );

    // Group sell orders by price and sum quantities
    const sellOrdersMap = allOrders
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .filter((order: any) => order.orderType === 'ASK')
      .reduce(
        (acc, order: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const price = Number(order.priceIdrsPerEtk);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const quantity = Number(order.amountEtk);
          acc[price] = (acc[price] || 0) + quantity;
          this.logger.debug(
            `Accumulating sell order: price=${price}, quantity=${quantity}, total=${acc[price]}`,
          );
          return acc;
        },
        {} as Record<number, number>,
      );

    // Convert to arrays and sort
    const buyOrders = Object.entries(buyOrdersMap)
      .map(([price, quantity]) => ({
        priceIdrsPerEtk: parseFloat(price),
        totalAmountEtk: Number(quantity),
        totalValueIdrs: parseFloat(price) * Number(quantity),
      }))
      .sort((a, b) => b.priceIdrsPerEtk - a.priceIdrsPerEtk); // Highest price first for buy orders

    const sellOrders = Object.entries(sellOrdersMap)
      .map(([price, quantity]) => ({
        priceIdrsPerEtk: parseFloat(price),
        totalAmountEtk: Number(quantity),
        totalValueIdrs: parseFloat(price) * Number(quantity),
      }))
      .sort((a, b) => a.priceIdrsPerEtk - b.priceIdrsPerEtk); // Lowest price first for sell orders

    // Calculate spread (difference between best bid and best ask)
    const bestBid = buyOrders.length > 0 ? buyOrders[0].priceIdrsPerEtk : 0;
    const bestAsk = sellOrders.length > 0 ? sellOrders[0].priceIdrsPerEtk : 0;
    const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
    const spreadPercentage = bestBid > 0 ? (spread / bestBid) * 100 : 0;

    return {
      success: true,
      data: {
        summary: {
          totalBuyOrders: buyOrders.length,
          totalSellOrders: sellOrders.length,
          bestBidPrice: bestBid,
          bestAskPrice: bestAsk,
          spread: parseFloat(spread.toFixed(2)),
          spreadPercentage: parseFloat(spreadPercentage.toFixed(2)),
          totalBuyVolume: buyOrders.reduce(
            (sum, order) => sum + order.totalAmountEtk,
            0,
          ),
          totalSellVolume: sellOrders.reduce(
            (sum, order) => sum + order.totalAmountEtk,
            0,
          ),
        },
        buyOrders: buyOrders.slice(0, 20), // Top 20 buy price levels
        sellOrders: sellOrders.slice(0, 20), // Top 20 sell price levels
      },
    };
  }

  @Get('trades')
  async getTrades(
    @Request() req: User,
    @Query('limit') limit?: string,
    @Query('scope') scope?: 'own' | 'public' | 'all',
  ) {
    const prosumerId = req.user.prosumerId;
    const maxLimit = limit ? parseInt(limit) : 50;
    const validScope = scope || 'own'; // Default to 'own' if not specified

    try {
      // Validate scope parameter
      if (!['own', 'public', 'all'].includes(validScope)) {
        throw new BadRequestException(
          'Invalid scope parameter. Must be one of: own, public, all',
        );
      }

      // Log admin scope access
      if (validScope === 'all') {
        this.logger.warn(`User ${prosumerId} requested 'all' scope for trades`);
      }

      let allTrades: any[] = [];

      if (validScope === 'own') {
        // Get user's own trades only
        const wallets = await this.walletsService.findAll({ prosumerId });
        const walletAddresses = wallets.map((w) => w.walletAddress);

        // Get trades involving user's wallets
        for (const walletAddress of walletAddresses) {
          const buyTrades = await this.marketTradesService.findAll({
            buyerWalletAddress: walletAddress,
          });
          const sellTrades = await this.marketTradesService.findAll({
            sellerWalletAddress: walletAddress,
          });
          allTrades.push(...buyTrades, ...sellTrades);
        }
      } else if (validScope === 'public') {
        // Get all trades with anonymized data
        const trades = await this.marketTradesService.findAll({});

        // Anonymize sensitive data for public view
        allTrades = trades.map((trade: any) => ({
          ...trade,
          // Anonymize wallet addresses and sensitive information
          buyerWalletAddress: trade.buyerWalletAddress
            ? trade.buyerWalletAddress.substring(0, 10) + '...'
            : null,
          sellerWalletAddress: trade.sellerWalletAddress
            ? trade.sellerWalletAddress.substring(0, 10) + '...'
            : null,
          blockchainTxHash: trade.blockchainTxHash
            ? trade.blockchainTxHash.substring(0, 12) + '...'
            : null,
          // Keep trading data for market analysis
          tradedEtkAmount: trade.tradedEtkAmount,
          priceIdrsPerEtk: trade.priceIdrsPerEtk,
          tradeTimestamp: trade.tradeTimestamp,
          tradeId: trade.tradeId,
        }));
      } else {
        // Get all trades with full data (admin/debug)
        allTrades = await this.marketTradesService.findAll({});
      }

      // Remove duplicates and sort by trade timestamp
      const uniqueTrades = allTrades
        .filter(
          (trade: any, index: number, self: any[]) =>
            index === self.findIndex((t: any) => t.tradeId === trade.tradeId),
        )
        .sort(
          (a: any, b: any) =>
            new Date(b.tradeTimestamp as string).getTime() -
            new Date(a.tradeTimestamp as string).getTime(),
        )
        .slice(0, maxLimit);

      return {
        success: true,
        data: uniqueTrades,
        metadata: {
          scope: validScope,
          prosumerId: validScope === 'own' ? prosumerId : 'multiple',
          limit: maxLimit,
          count: uniqueTrades.length,
        },
        message: `Trades retrieved successfully (${validScope} scope)`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error getting trades:', error);
      throw new BadRequestException('Failed to retrieve trades');
    }
  }

  @Get('market-stats')
  async getMarketStats() {
    // Get recent trades for market statistics
    const recentTrades = await this.marketTradesService.findAll({});
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trades24h = recentTrades.filter(
      (trade) => new Date(trade.tradeTimestamp) > last24Hours,
    );

    const volume24h = trades24h.reduce(
      (sum, trade) => sum + Number(trade.tradedEtkAmount),
      0,
    );
    const avgPrice24h =
      trades24h.length > 0
        ? trades24h.reduce(
            (sum, trade) => sum + Number(trade.priceIdrsPerEtk),
            0,
          ) / trades24h.length
        : 0;

    const lastTrade = recentTrades.sort(
      (a, b) =>
        new Date(b.tradeTimestamp).getTime() -
        new Date(a.tradeTimestamp).getTime(),
    )[0];

    // Get current blockchain market price
    const currentMarketPrice = await this.blockchainService.getMarketPrice();

    // Get token supply information
    // const etkTotalSupply = await this.blockchainService.getETKTotalSupply();
    // const idrsTotalSupply = await this.blockchainService.getIDRSTotalSupply();

    const marketLiquidity = await this.blockchainService.getMarketLiquidity();

    return {
      success: true,
      data: {
        lastPrice: lastTrade ? Number(lastTrade.priceIdrsPerEtk) : 0,
        currentMarketPrice,
        volume24h,
        averagePrice24h: avgPrice24h,
        tradesCount24h: trades24h.length,
        marketLiquidity,
      },
    };
  }

  @Post('cancel-order')
  async cancelOrder(
    @Body() body: { orderId: string; isBuyOrder: boolean },
    @Request() req: User,
  ) {
    const prosumerId = req.user.prosumerId;

    try {
      // Get order from cache to verify ownership
      const cachedOrder = await this.tradeOrdersCacheService.findOne(
        body.orderId,
      );

      if (cachedOrder.prosumerId !== prosumerId) {
        throw new BadRequestException(
          'Unauthorized: You do not own this order',
        );
      }

      if (cachedOrder.statusOnChain !== 'OPEN') {
        throw new BadRequestException(
          `Order is not open (current status: ${cachedOrder.statusOnChain})`,
        );
      }

      // Verify wallet ownership
      await this.verifyWalletOwnership(cachedOrder.walletAddress, prosumerId);

      // Call blockchain cancel order function
      const txHash = await this.blockchainService.cancelOrder(
        cachedOrder.walletAddress,
        body.orderId,
        body.isBuyOrder,
      );

      return {
        success: true,
        transactionHash: txHash,
        message: `Order ${body.orderId} cancellation submitted`,
      };
    } catch (error) {
      this.logger.error('Error cancelling order:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to cancel order');
    }
  }

  @Get('wallet/:walletAddress/balances')
  async getTradingWalletBalances(
    @Param('walletAddress') walletAddress: string,
    @Request() req: User,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify wallet ownership
    await this.verifyWalletOwnership(walletAddress, prosumerId);

    const balances = await this.getWalletBalances(walletAddress);

    return {
      success: true,
      data: balances,
      message: 'Wallet balances retrieved successfully',
    };
  }

  @Get('market/etk-supply')
  async getETKSupplyInMarket() {
    try {
      const etkSupply =
        await this.blockchainService.getTotalETKSupplyInMarket();
      return {
        etkSupply,
      };
    } catch (error) {
      this.logger.error('Error getting ETK supply in market:', error);
      throw new BadRequestException('Failed to get ETK supply in market');
    }
  }

  @Get('market/idrs-supply')
  async getIDRSSupplyInMarket() {
    try {
      const idrsSupply =
        await this.blockchainService.getTotalIDRSSupplyInMarket();
      return {
        idrsSupply,
      };
    } catch (error) {
      this.logger.error('Error getting IDRS supply in market:', error);
      throw new BadRequestException('Failed to get IDRS supply in market');
    }
  }

  @Get('market/liquidity')
  async getMarketLiquidity() {
    try {
      const liquidity = await this.blockchainService.getMarketLiquidity();
      return liquidity;
    } catch (error) {
      this.logger.error('Error getting market liquidity:', error);
      throw new BadRequestException('Failed to get market liquidity');
    }
  }

  @Get('price-history')
  async getPriceHistory(
    @Query('interval') interval: string = '1m', // 1s, 1m, 5m, 15m, 1h, 1d
    @Query('limit') limit: string = '1000',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    try {
      const maxLimit = Math.min(parseInt(limit) || 1000, 5000); // Max 5000 candles
      const startTime = from
        ? new Date(from)
        : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default 24h ago
      const endTime = to ? new Date(to) : new Date();

      // Try to get from cache first for better performance
      let priceHistory;
      if (['1s', '1m', '5m'].includes(interval) && !from && !to) {
        // Use cache for real-time intervals
        if (interval === '1s' || interval === '1m') {
          priceHistory = this.priceCacheService.getPriceHistory(
            interval,
            maxLimit,
          );
        } else {
          priceHistory = this.priceCacheService.getPriceCandles(
            interval,
            maxLimit,
          );
        }
      } else {
        // Use database for historical data
        priceHistory = await this.marketTradesService.getPriceHistory(
          interval,
          maxLimit,
          startTime,
          endTime,
        );
      }

      return {
        success: true,
        data: priceHistory,
        metadata: {
          interval,
          limit: maxLimit,
          from: startTime.toISOString(),
          to: endTime.toISOString(),
          count: priceHistory.length,
        },
      };
    } catch (error) {
      this.logger.error('Error getting price history:', error);
      throw new BadRequestException('Failed to retrieve price history');
    }
  }

  @Get('price-history/realtime')
  async getRealTimePriceData() {
    try {
      // Get cached current price for better performance
      const currentPrice = this.priceCacheService.getCurrentPrice();

      // Get last 100 trades for real-time price feed
      const recentTrades = await this.marketTradesService.findRecentTrades(100);

      // Calculate price change from 24h ago
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const trades24h = recentTrades.filter(
        (trade) => new Date(trade.tradeTimestamp) > yesterday,
      );

      const priceChange24h =
        trades24h.length > 0
          ? currentPrice -
            Number(trades24h[trades24h.length - 1].priceIdrsPerEtk)
          : 0;

      const priceChangePercent =
        trades24h.length > 0
          ? (priceChange24h /
              Number(trades24h[trades24h.length - 1].priceIdrsPerEtk)) *
            100
          : 0;

      return {
        success: true,
        data: {
          price: currentPrice,
          timestamp: new Date().toISOString(),
          change24h: Math.round(priceChange24h * 100) / 100,
          changePercent24h: Math.round(priceChangePercent * 100) / 100,
          volume24h: trades24h.reduce(
            (sum, trade) => sum + Number(trade.tradedEtkAmount),
            0,
          ),
          trades: recentTrades.slice(0, 20).map((trade) => ({
            price: Number(trade.priceIdrsPerEtk),
            volume: Number(trade.tradedEtkAmount),
            timestamp: trade.tradeTimestamp,
            side: 'unknown', // Will be populated when trade side is available
          })),
        },
      };
    } catch (error) {
      this.logger.error('Error getting real-time price data:', error);
      throw new BadRequestException('Failed to retrieve real-time price data');
    }
  }

  @Get('price-history/candles')
  async getPriceCandles(
    @Query('interval') interval: string = '1m',
    @Query('limit') limit: string = '300',
  ) {
    try {
      const maxLimit = Math.min(parseInt(limit) || 300, 1000);

      // Try cache first for supported intervals
      let candles;
      if (['1m', '5m', '1h'].includes(interval)) {
        candles = this.priceCacheService.getPriceCandles(interval, maxLimit);
      } else {
        candles = await this.marketTradesService.getPriceCandles(
          interval,
          maxLimit,
        );
      }

      return {
        success: true,
        data: candles,
        metadata: {
          interval,
          limit: maxLimit,
          count: candles.length,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Error getting price candles:', error);
      throw new BadRequestException('Failed to retrieve price candles');
    }
  }

  private async verifyWalletOwnership(
    walletAddress: string,
    prosumerId: string,
  ) {
    try {
      // Verify wallet exists and user owns it
      const prosumers =
        await this.prosumersService.findByWalletAddress(walletAddress);

      if (!prosumers.find((p) => p.prosumerId === prosumerId)) {
        throw new BadRequestException(
          'Unauthorized: You do not own this wallet',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Wallet not found');
    }
  }

  private async checkSufficientBalance(orderRequest: PlaceOrderRequest) {
    try {
      // Get wallet balances using helper method
      const balances = await this.getWalletBalances(orderRequest.walletAddress);

      this.logger.debug(
        `Wallet ${orderRequest.walletAddress} balances - ETK: ${balances.ETK}, IDRS: ${balances.IDRS}`,
      );

      if (orderRequest.orderType === 'BID') {
        // For BID (buy) orders, need sufficient IDRS to pay
        const totalCost = orderRequest.quantity * orderRequest.price;

        if (balances.IDRS < totalCost) {
          throw new BadRequestException(
            `Insufficient IDRS balance. Required: ${totalCost.toFixed(
              2,
            )} IDRS, Available: ${balances.IDRS.toFixed(2)} IDRS`,
          );
        }

        this.logger.log(
          `BID order validation passed - Required: ${totalCost.toFixed(
            2,
          )} IDRS, Available: ${balances.IDRS.toFixed(2)} IDRS`,
        );
      } else if (orderRequest.orderType === 'ASK') {
        // For ASK (sell) orders, need sufficient ETK to sell
        if (balances.ETK < orderRequest.quantity) {
          throw new BadRequestException(
            `Insufficient ETK balance. Required: ${orderRequest.quantity.toFixed(
              2,
            )} ETK, Available: ${balances.ETK.toFixed(2)} ETK`,
          );
        }

        this.logger.log(
          `ASK order validation passed - Required: ${orderRequest.quantity.toFixed(
            2,
          )} ETK, Available: ${balances.ETK.toFixed(2)} ETK`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error checking wallet balance:', error);
      throw new BadRequestException(
        'Failed to verify wallet balance. Please try again.',
      );
    }
  }

  private async getWalletBalances(walletAddress: string) {
    try {
      const [etkBalance, idrsBalance] = await Promise.all([
        this.blockchainService.getTokenBalance(
          walletAddress,
          process.env.CONTRACT_ETK_TOKEN!,
        ),
        this.blockchainService.getTokenBalance(
          walletAddress,
          process.env.CONTRACT_IDRS_TOKEN!,
        ),
      ]);

      return {
        ETK: etkBalance,
        IDRS: idrsBalance,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch balances for wallet ${walletAddress}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        ETK: 0,
        IDRS: 0,
      };
    }
  }
}
