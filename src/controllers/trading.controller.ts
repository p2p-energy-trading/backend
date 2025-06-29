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
