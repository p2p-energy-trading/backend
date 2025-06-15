import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { BlockchainService } from '../services/blockchain.service';
import { WalletsService } from '../graphql/Wallets/Wallets.service';
import { TradeOrdersCacheService } from '../graphql/TradeOrdersCache/TradeOrdersCache.service';
import { MarketTradesService } from '../graphql/MarketTrades/MarketTrades.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { OrderType } from '../common/enums';

interface PlaceOrderRequest {
  walletAddress: string;
  orderType: 'BID' | 'ASK';
  quantity: number;
  price: number;
}

interface ApproveTokenRequest {
  walletAddress: string;
  tokenContract: string;
  spenderContract: string;
  amount: number;
}

@Controller('trading')
@UseGuards(JwtAuthGuard)
export class TradingController {
  constructor(
    private blockchainService: BlockchainService,
    private walletsService: WalletsService,
    private tradeOrdersCacheService: TradeOrdersCacheService,
    private marketTradesService: MarketTradesService,
  ) {}

  @Post('approve')
  async approveToken(@Body() body: ApproveTokenRequest, @Request() req) {
    const prosumerId = req.user.prosumerId;

    // Verify wallet ownership
    await this.verifyWalletOwnership(body.walletAddress, prosumerId);

    const txHash = await this.blockchainService.approveToken(
      body.walletAddress,
      body.tokenContract,
      body.spenderContract,
      body.amount,
    );

    return {
      success: true,
      transactionHash: txHash,
      message: 'Token approval transaction sent',
    };
  }

  @Post('order')
  async placeOrder(@Body() body: PlaceOrderRequest, @Request() req) {
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
  async getOrders(@Request() req, @Query('status') status?: string) {
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
        (order) => order.statusOnChain === status,
      );
    }

    return {
      success: true,
      data: filteredOrders.sort(
        (a, b) =>
          new Date(b.createdAtOnChain).getTime() -
          new Date(a.createdAtOnChain).getTime(),
      ),
    };
  }

  @Get('orderbook')
  async getOrderBook() {
    const allOrders = await this.tradeOrdersCacheService.findAll({
      statusOnChain: 'OPEN',
    });

    const buyOrders = allOrders
      .filter((order) => order.orderType === OrderType.BID)
      .sort((a, b) => b.priceIdrsPerEtk - a.priceIdrsPerEtk); // Highest price first for buy orders

    const sellOrders = allOrders
      .filter((order) => order.orderType === OrderType.ASK)
      .sort((a, b) => a.priceIdrsPerEtk - b.priceIdrsPerEtk); // Lowest price first for sell orders

    return {
      success: true,
      data: {
        buyOrders: buyOrders.slice(0, 20), // Top 20 buy orders
        sellOrders: sellOrders.slice(0, 20), // Top 20 sell orders
      },
    };
  }

  @Get('trades')
  async getTrades(@Request() req, @Query('limit') limit?: string) {
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
        (trade, index, self) =>
          index === self.findIndex((t) => t.tradeId === trade.tradeId),
      )
      .sort(
        (a, b) =>
          new Date(b.tradeTimestamp).getTime() -
          new Date(a.tradeTimestamp).getTime(),
      )
      .slice(0, maxLimit);

    return {
      success: true,
      data: uniqueTrades,
    };
  }

  @Get('balances/:walletAddress')
  async getWalletBalances(
    @Param('walletAddress') walletAddress: string,
    @Request() req,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify wallet ownership
    await this.verifyWalletOwnership(walletAddress, prosumerId);

    const ethBalance =
      await this.blockchainService.getEthBalance(walletAddress);
    const etkBalance = await this.blockchainService.getTokenBalance(
      walletAddress,
      process.env.CONTRACT_ETK_TOKEN ||
        '0x0000000000000000000000000000000000000000',
    );
    const idrsBalance = await this.blockchainService.getTokenBalance(
      walletAddress,
      process.env.CONTRACT_IDRS_TOKEN ||
        '0x0000000000000000000000000000000000000000',
    );

    return {
      success: true,
      data: {
        walletAddress,
        balances: {
          ETH: ethBalance,
          ETK: etkBalance,
          IDRS: idrsBalance,
        },
      },
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
      (sum, trade) => sum + trade.tradedEtkAmount,
      0,
    );
    const avgPrice24h =
      trades24h.length > 0
        ? trades24h.reduce((sum, trade) => sum + trade.priceIdrsPerEtk, 0) /
          trades24h.length
        : 0;

    const lastTrade = recentTrades.sort(
      (a, b) =>
        new Date(b.tradeTimestamp).getTime() -
        new Date(a.tradeTimestamp).getTime(),
    )[0];

    return {
      success: true,
      data: {
        lastPrice: lastTrade?.priceIdrsPerEtk || 0,
        volume24h,
        averagePrice24h: avgPrice24h,
        tradesCount24h: trades24h.length,
      },
    };
  }

  private async verifyWalletOwnership(
    walletAddress: string,
    prosumerId: string,
  ) {
    try {
      const wallet = await this.walletsService.findOne(walletAddress);
      const prosumers = await this.walletsService.findProsumers(walletAddress);

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
