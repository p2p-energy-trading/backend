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
} from '@nestjs/common';
import { BlockchainService } from '../services/blockchain.service';
import { EnergySettlementService } from '../services/energy-settlement.service';
import { WalletsService } from '../modules/Wallets/Wallets.service';
import { TradeOrdersCacheService } from '../modules/TradeOrdersCache/TradeOrdersCache.service';
import { MarketTradesService } from '../modules/MarketTrades/MarketTrades.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { ProsumersService } from 'src/modules/Prosumers/Prosumers.service';

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
  ) {}

  @Post('order')
  async placeOrder(@Body() body: PlaceOrderRequest, @Request() req: User) {
    const prosumerId = req.user.prosumerId;

    // Verify wallet ownership
    await this.verifyWalletOwnership(body.walletAddress, prosumerId);

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
  async getOrders(@Request() req: User, @Query('status') status?: string) {
    const prosumerId = req.user.prosumerId;

    // Get user's wallets
    const wallets = await this.walletsService.findAll({ prosumerId });
    const walletAddresses = wallets.map((w) => w.walletAddress);

    // Get orders for all user's wallets
    const allOrders: any[] = [];
    for (const walletAddress of walletAddresses) {
      const orders = await this.tradeOrdersCacheService.findAll({
        walletAddress: walletAddress,
      });
      allOrders.push(...orders);
    }

    // Filter by status if provided
    let filteredOrders = allOrders;
    if (status) {
      filteredOrders = allOrders.filter(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (order: any) => order.statusOnChain === status,
      );
    }

    return {
      success: true,
      data: filteredOrders.sort(
        (a: any, b: any) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          new Date(b.createdAtOnChain as string).getTime() -
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          new Date(a.createdAtOnChain as string).getTime(),
      ),
    };
  }

  @Get('orderbook-detailed')
  async getOrderBookDetailed() {
    const allOrders = await this.tradeOrdersCacheService.findAll({
      statusOnChain: 'OPEN',
    });

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
    const allOrders = await this.tradeOrdersCacheService.findAll({
      statusOnChain: 'OPEN',
    });

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
  async getTrades(@Request() req: User, @Query('limit') limit?: string) {
    const prosumerId = req.user.prosumerId;
    const maxLimit = limit ? parseInt(limit) : 50;

    // Get user's wallets
    const wallets = await this.walletsService.findAll({ prosumerId });
    const walletAddresses = wallets.map((w) => w.walletAddress);

    // Get trades involving user's wallets
    const allTrades: any[] = [];
    for (const walletAddress of walletAddresses) {
      const buyTrades = await this.marketTradesService.findAll({
        buyerWalletAddress: walletAddress,
      });
      const sellTrades = await this.marketTradesService.findAll({
        sellerWalletAddress: walletAddress,
      });
      allTrades.push(...buyTrades, ...sellTrades);
    }

    // Remove duplicates and sort by trade timestamp
    const uniqueTrades = allTrades
      .filter(
        (trade: any, index: number, self: any[]) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          index === self.findIndex((t: any) => t.tradeId === trade.tradeId),
      )
      .sort(
        (a: any, b: any) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          new Date(b.tradeTimestamp as string).getTime() -
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          new Date(a.tradeTimestamp as string).getTime(),
      )
      .slice(0, maxLimit);

    return {
      success: true,
      data: uniqueTrades,
    };
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
    const etkTotalSupply = await this.blockchainService.getETKTotalSupply();
    const idrsTotalSupply = await this.blockchainService.getIDRSTotalSupply();

    return {
      success: true,
      data: {
        lastPrice: lastTrade ? Number(lastTrade.priceIdrsPerEtk) : 0,
        currentMarketPrice,
        volume24h,
        averagePrice24h: avgPrice24h,
        tradesCount24h: trades24h.length,
        tokenSupply: {
          ETK: etkTotalSupply,
          IDRS: idrsTotalSupply,
        },
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
}
