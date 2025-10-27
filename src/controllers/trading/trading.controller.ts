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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { BlockchainService } from '../../services/blockchain/blockchain.service';
import { EnergySettlementService } from '../../services/energy/energy-settlement.service';
import { TradingAnalyticsService } from '../../services/trading/trading-analytics.service';
import { WalletsService } from '../../models/wallet/Wallets.service';
import { TradeOrdersCacheRedisService } from '../../services/trading/trade-orders-cache-redis.service';
import { MarketTradesService } from '../../models/marketTrade/marketTrade.service';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { ProsumersService } from 'src/models/prosumer/user.service';
import { PriceCacheService } from '../../services/trading/price-cache.service';
import {
  ApiSuccessResponse,
  ApiPaginatedResponse,
} from '../../common/interfaces';
import { ResponseFormatter } from '../../common/response-formatter';
import {
  PlaceOrderDto,
  PlaceOrderResponseDto,
  CancelOrderDto,
  OrderResponseDto,
  TradeResponseDto,
  OrderBookSummaryDto,
} from '../../common/dto/trading.dto';

interface User extends Request {
  user: {
    prosumerId: string;
  };
}

@ApiTags('Trading')
@ApiBearerAuth('JWT-auth')
@Controller('trading')
@UseGuards(JwtAuthGuard)
export class TradingController {
  private readonly logger = new Logger(TradingController.name);

  constructor(
    private blockchainService: BlockchainService,
    private energySettlementService: EnergySettlementService,
    private tradingAnalyticsService: TradingAnalyticsService,
    private walletsService: WalletsService,
    private tradeOrdersCacheService: TradeOrdersCacheRedisService,
    private marketTradesService: MarketTradesService,
    private prosumersService: ProsumersService,
    private priceCacheService: PriceCacheService,
  ) {}

  /**
   * Safely anonymize a string by taking the first N characters and adding '...'
   * @param value - The string to anonymize
   * @param length - Number of characters to keep (default: 10)
   * @returns Anonymized string or null if input is invalid
   */
  private anonymizeString(value: any, length: number = 10): string | null {
    if (!value || typeof value !== 'string') {
      return null;
    }
    return value.length > length ? value.substring(0, length) + '...' : value;
  }

  /**
   * Safely anonymize order data for public scope
   */
  private anonymizeOrderData(order: any): any {
    const orderData = order as {
      walletAddress?: string;
      prosumerId?: string;
      blockchainTxHash?: string;
    };

    return {
      ...order,
      walletAddress: this.anonymizeString(orderData.walletAddress, 10),
      prosumerId: this.anonymizeString(orderData.prosumerId, 8),
      blockchainTxHash: this.anonymizeString(orderData.blockchainTxHash, 12),
    };
  }

  /**
   * Safely anonymize trade data for public scope
   */
  private anonymizeTradeData(trade: any): any {
    const tradeData = trade as {
      buyerWalletAddress?: string;
      sellerWalletAddress?: string;
      blockchainTxHash?: string;
      tradedEtkAmount?: string | number;
      priceIdrsPerEtk?: string | number;
      tradeTimestamp?: string;
      tradeId?: string;
    };

    return {
      ...trade,
      buyerWalletAddress: this.anonymizeString(
        tradeData.buyerWalletAddress,
        10,
      ),
      sellerWalletAddress: this.anonymizeString(
        tradeData.sellerWalletAddress,
        10,
      ),
      blockchainTxHash: this.anonymizeString(tradeData.blockchainTxHash, 12),
      // Preserve trading data for market analysis
      tradedEtkAmount: tradeData.tradedEtkAmount || null,
      priceIdrsPerEtk: tradeData.priceIdrsPerEtk || null,
      tradeTimestamp: tradeData.tradeTimestamp || null,
      tradeId: tradeData.tradeId || null,
    };
  }

  @Post('order')
  @ApiOperation({
    summary: 'Place a trading order',
    description:
      'Place a BID (buy) or ASK (sell) order for ETK/IDRS trading pair',
  })
  @ApiBody({ type: PlaceOrderDto })
  @ApiResponse({
    status: 201,
    description: 'Order placed successfully',
    type: PlaceOrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters or insufficient balance',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async placeOrder(@Body() body: PlaceOrderDto, @Request() req: User) {
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

    return ResponseFormatter.success(
      { transactionHash: txHash },
      `${body.orderType} order placed successfully`,
    );
  }

  @Get('orders')
  @ApiOperation({
    summary: 'Get trading orders',
    description: 'Retrieve trading orders with filtering options',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Filter by order status (OPEN, PARTIALLY_FILLED, FILLED, CANCELLED)',
    example: 'OPEN',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['own', 'public', 'all'],
    description: 'Scope: own (your orders), public (anonymized), all (admin)',
    example: 'own',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of orders to return',
    example: '50',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
    type: [OrderResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid scope parameter',
  })
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        allOrders = orders.map((order: any) => this.anonymizeOrderData(order));
      } else {
        // Get all orders with full data (admin/debug)
        allOrders = await this.tradeOrdersCacheService.findAll({});
      }

      // Filter by status if provided
      let filteredOrders = allOrders;
      if (status) {
        filteredOrders = allOrders.filter((order: any) => {
          const orderStatus = (order as { statusOnChain?: string })
            ?.statusOnChain;
          return orderStatus === status;
        });
      }

      // Sort by creation date and apply limit
      const sortedOrders = filteredOrders
        .sort((a: any, b: any) => {
          const aTime = (a as { createdAtOnChain?: string })?.createdAtOnChain;
          const bTime = (b as { createdAtOnChain?: string })?.createdAtOnChain;
          if (!aTime || !bTime) return 0;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        })
        .slice(0, maxLimit);

      return ResponseFormatter.successWithMetadata(
        sortedOrders,
        {
          scope: validScope,
          prosumerId: validScope === 'own' ? prosumerId : 'multiple',
          status: status || 'all',
          limit: maxLimit,
          count: sortedOrders.length,
        },
        `Orders retrieved successfully (${validScope} scope)`,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error getting orders:', error);
      return ResponseFormatter.error(
        'Failed to retrieve orders',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('orderbook-detailed')
  @ApiOperation({
    summary: 'Get detailed order book',
    description: 'Retrieve top 20 buy and sell orders with full details',
  })
  @ApiResponse({
    status: 200,
    description: 'Order book retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            buyOrders: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderResponseDto' },
            },
            sellOrders: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderResponseDto' },
            },
          },
        },
      },
    },
  })
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

    return ResponseFormatter.success(
      {
        buyOrders: buyOrders.slice(0, 20), // Top 20 buy orders
        sellOrders: sellOrders.slice(0, 20), // Top 20 sell orders
      },
      'Order book retrieved successfully',
    );
  }

  @Get('orderbook')
  @ApiOperation({
    summary: 'Get aggregated order book',
    description: 'Retrieve order book with orders grouped by price level',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated order book retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            buyOrders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  price: { type: 'string', example: '1450' },
                  quantity: { type: 'string', example: '250.5' },
                },
              },
            },
            sellOrders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  price: { type: 'string', example: '1550' },
                  quantity: { type: 'string', example: '180.3' },
                },
              },
            },
          },
        },
      },
    },
  })
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
          // this.logger.debug(
          //   `Accumulating sell order: price=${price}, quantity=${quantity}, total=${acc[price]}`,
          // );
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

    return ResponseFormatter.success(
      {
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
      'Aggregated order book retrieved successfully',
    );
  }

  @Get('trades')
  @ApiOperation({
    summary: 'Get executed trades',
    description: 'Retrieve list of executed trades with filtering options',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of trades to return',
    example: '50',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['own', 'public', 'all'],
    description:
      'Data scope: own (your trades), public (anonymized), all (admin)',
    example: 'own',
  })
  @ApiResponse({
    status: 200,
    description: 'Trades retrieved successfully',
    type: [TradeResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid scope parameter',
  })
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        allTrades = trades.map((trade: any) => this.anonymizeTradeData(trade));
      } else {
        // Get all trades with full data (admin/debug)
        allTrades = await this.marketTradesService.findAll({});
      }

      // Remove duplicates and sort by trade timestamp
      const uniqueTrades = allTrades
        .filter((trade: any, index: number, self: any[]) => {
          const tradeId = (trade as { tradeId?: string })?.tradeId;
          return (
            index ===
            self.findIndex((t: any) => {
              const tId = (t as { tradeId?: string })?.tradeId;
              return tId === tradeId;
            })
          );
        })
        .sort((a: any, b: any) => {
          const aTime = (a as { tradeTimestamp?: string })?.tradeTimestamp;
          const bTime = (b as { tradeTimestamp?: string })?.tradeTimestamp;
          if (!aTime || !bTime) return 0;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        })
        .slice(0, maxLimit);

      return ResponseFormatter.successWithMetadata(
        uniqueTrades,
        {
          scope: validScope,
          prosumerId: validScope === 'own' ? prosumerId : 'multiple',
          limit: maxLimit,
          count: uniqueTrades.length,
        },
        `Trades retrieved successfully (${validScope} scope)`,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error getting trades:', error);
      return ResponseFormatter.error(
        'Failed to retrieve trades',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('market-stats')
  @ApiOperation({
    summary: 'Get market statistics',
    description:
      'Retrieve market statistics including price, volume, and liquidity',
  })
  @ApiResponse({
    status: 200,
    description: 'Market statistics retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            lastPrice: { type: 'number', example: 1500 },
            currentMarketPrice: { type: 'string', example: '1500' },
            volume24h: { type: 'number', example: 1250.5 },
            averagePrice24h: { type: 'number', example: 1485.3 },
            tradesCount24h: { type: 'number', example: 45 },
            marketLiquidity: {
              type: 'object',
              properties: {
                etkBalance: { type: 'string', example: '5000' },
                idrsBalance: { type: 'string', example: '7500000' },
              },
            },
          },
        },
      },
    },
  })
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

    return ResponseFormatter.success(
      {
        lastPrice: lastTrade ? Number(lastTrade.priceIdrsPerEtk) : 0,
        currentMarketPrice,
        volume24h,
        averagePrice24h: avgPrice24h,
        tradesCount24h: trades24h.length,
        marketLiquidity,
      },
      'Market statistics retrieved successfully',
    );
  }

  @Post('cancel-order')
  @ApiOperation({
    summary: 'Cancel an order',
    description: 'Cancel an open trading order',
  })
  @ApiBody({ type: CancelOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        transactionHash: {
          type: 'string',
          example: '0xabcd1234567890abcdef...',
        },
        message: { type: 'string', example: 'Order cancelled successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Unauthorized or order cannot be cancelled',
  })
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

      return ResponseFormatter.success(
        { transactionHash: txHash },
        `Order ${body.orderId} cancellation submitted`,
      );
    } catch (error) {
      this.logger.error('Error cancelling order:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      return ResponseFormatter.error(
        'Failed to cancel order',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('wallet/:walletAddress/balances')
  @ApiOperation({
    summary: 'Get wallet balances for trading',
    description: 'Retrieve ETK and IDRS balances for a specific wallet',
  })
  @ApiParam({
    name: 'walletAddress',
    description: 'Ethereum wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @ApiResponse({
    status: 200,
    description: 'Balances retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            etk: { type: 'string', example: '150.5' },
            idrs: { type: 'string', example: '500000' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Unauthorized - wallet does not belong to user',
  })
  async getTradingWalletBalances(
    @Param('walletAddress') walletAddress: string,
    @Request() req: User,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify wallet ownership
    await this.verifyWalletOwnership(walletAddress, prosumerId);

    const balances = await this.getWalletBalances(walletAddress);

    return ResponseFormatter.success(
      balances,
      'Wallet balances retrieved successfully',
    );
  }

  @Get('market/etk-supply')
  @ApiOperation({
    summary: 'Get ETK supply in market',
    description:
      'Retrieve total ETK token supply available in the market contract',
  })
  @ApiResponse({
    status: 200,
    description: 'ETK supply retrieved successfully',
    schema: {
      properties: {
        etkSupply: { type: 'string', example: '50000.5' },
      },
    },
  })
  async getETKSupplyInMarket() {
    try {
      const etkSupply =
        await this.blockchainService.getTotalETKSupplyInMarket();
      return ResponseFormatter.success(
        { etkSupply },
        'ETK supply retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Error getting ETK supply in market:', error);
      return ResponseFormatter.error(
        'Failed to get ETK supply in market',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('market/idrs-supply')
  @ApiOperation({
    summary: 'Get IDRS supply in market',
    description:
      'Retrieve total IDRS token supply available in the market contract',
  })
  @ApiResponse({
    status: 200,
    description: 'IDRS supply retrieved successfully',
    schema: {
      properties: {
        idrsSupply: { type: 'string', example: '75000000' },
      },
    },
  })
  async getIDRSSupplyInMarket() {
    try {
      const idrsSupply =
        await this.blockchainService.getTotalIDRSSupplyInMarket();
      return ResponseFormatter.success(
        { idrsSupply },
        'IDRS supply retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Error getting IDRS supply in market:', error);
      return ResponseFormatter.error(
        'Failed to get IDRS supply in market',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('market/liquidity')
  @ApiOperation({
    summary: 'Get market liquidity',
    description:
      'Retrieve current market liquidity (ETK and IDRS balances in market contract)',
  })
  @ApiResponse({
    status: 200,
    description: 'Market liquidity retrieved successfully',
    schema: {
      properties: {
        etkBalance: { type: 'string', example: '5000' },
        idrsBalance: { type: 'string', example: '7500000' },
      },
    },
  })
  async getMarketLiquidity() {
    try {
      const liquidity = await this.blockchainService.getMarketLiquidity();
      return ResponseFormatter.success(
        liquidity,
        'Market liquidity retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Error getting market liquidity:', error);
      return ResponseFormatter.error(
        'Failed to get market liquidity',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('price-history')
  @ApiOperation({
    summary: 'Get price history',
    description: 'Retrieve historical price data with various time intervals',
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    description: 'Time interval: 1s, 1m, 5m, 15m, 1h, 1d',
    example: '1m',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of data points (max: 5000)',
    example: '1000',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start timestamp (ISO 8601)',
    example: '2025-10-22T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End timestamp (ISO 8601)',
    example: '2025-10-23T00:00:00.000Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Price history retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              time: { type: 'number', example: 1698123456 },
              open: { type: 'number', example: 1450 },
              high: { type: 'number', example: 1550 },
              low: { type: 'number', example: 1400 },
              close: { type: 'number', example: 1500 },
              volume: { type: 'number', example: 150.5 },
            },
          },
        },
      },
    },
  })
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
          priceHistory = await this.priceCacheService.getPriceHistory(
            interval,
            maxLimit,
          );
        } else {
          priceHistory = await this.priceCacheService.getPriceCandles(
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

      return ResponseFormatter.successWithMetadata(
        priceHistory as any[],
        {
          interval,
          limit: maxLimit,
          from: startTime.toISOString(),
          to: endTime.toISOString(),
          count: Array.isArray(priceHistory) ? priceHistory.length : 0,
        },
        'Price history retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Error getting price history:', error);
      return ResponseFormatter.error(
        'Failed to retrieve price history',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('price-history/realtime')
  @ApiOperation({
    summary: 'Get real-time price data',
    description: 'Retrieve current price with 24h statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Real-time price data retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            price: { type: 'number', example: 1500 },
            timestamp: { type: 'string', example: '2025-10-23T10:30:00.000Z' },
            change24h: { type: 'number', example: 50 },
            changePercent24h: { type: 'number', example: 3.45 },
            volume24h: { type: 'number', example: 1250.5 },
            high24h: { type: 'number', example: 1550 },
            low24h: { type: 'number', example: 1400 },
          },
        },
      },
    },
  })
  async getRealTimePriceData() {
    try {
      // Get cached current price for better performance
      const currentPrice = await this.priceCacheService.getCurrentPrice();

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

      return ResponseFormatter.success(
        {
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
        'Real-time price data retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Error getting real-time price data:', error);
      return ResponseFormatter.error(
        'Failed to retrieve real-time price data',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  @Get('price-history/candles')
  @ApiOperation({
    summary: 'Get price candles (OHLCV)',
    description: 'Retrieve candlestick data for TradingView charts',
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    description: 'Candle interval: 1m, 5m, 15m, 1h, 1d',
    example: '1m',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of candles (max: 1000)',
    example: '300',
  })
  @ApiResponse({
    status: 200,
    description: 'Price candles retrieved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              time: { type: 'number', example: 1698123456 },
              open: { type: 'number', example: 1450 },
              high: { type: 'number', example: 1550 },
              low: { type: 'number', example: 1400 },
              close: { type: 'number', example: 1500 },
              volume: { type: 'number', example: 150.5 },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            interval: { type: 'string', example: '1m' },
            limit: { type: 'number', example: 300 },
            count: { type: 'number', example: 300 },
            generatedAt: {
              type: 'string',
              example: '2025-10-23T10:30:00.000Z',
            },
          },
        },
      },
    },
  })
  async getPriceCandles(
    @Query('interval') interval: string = '1m',
    @Query('limit') limit: string = '300',
  ) {
    try {
      const maxLimit = Math.min(parseInt(limit) || 300, 1000);

      // Try cache first for supported intervals
      let candles;
      if (['1m', '5m', '1h'].includes(interval)) {
        candles = await this.priceCacheService.getPriceCandles(
          interval,
          maxLimit,
        );
      } else {
        candles = await this.marketTradesService.getPriceCandles(
          interval,
          maxLimit,
        );
      }

      return ResponseFormatter.successWithMetadata(
        candles as any[],
        {
          interval,
          limit: maxLimit,
          count: Array.isArray(candles) ? candles.length : 0,
          generatedAt: new Date().toISOString(),
        },
        'Price candles retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Error getting price candles:', error);
      return ResponseFormatter.error(
        'Failed to retrieve price candles',
        error instanceof Error ? error.message : String(error),
      );
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

  private async checkSufficientBalance(orderRequest: PlaceOrderDto) {
    try {
      // Get wallet balances using helper method
      const balances = await this.getWalletBalances(orderRequest.walletAddress);

      // this.logger.debug(
      //   `Wallet ${orderRequest.walletAddress} balances - ETK: ${balances.ETK}, IDRS: ${balances.IDRS}`,
      // );

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
      return ResponseFormatter.error(
        'Failed to verify wallet balance. Please try again.',
        error instanceof Error ? error.message : String(error),
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

  /**
   * Get detailed trading performance metrics
   * Moved from DashboardController for better organization
   */
  @Get('performance')
  @ApiOperation({
    summary: 'Get Trading Performance',
    description:
      'Get detailed trading performance metrics including trade statistics, financial summary, and current balances',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (default: 30)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Trading performance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            period: { type: 'string', example: '30 days' },
            summary: {
              type: 'object',
              properties: {
                totalTrades: { type: 'number', example: 25 },
                totalVolume: { type: 'string', example: '150.500' },
                averagePrice: { type: 'string', example: '1250.75' },
                last24hVolume: { type: 'string', example: '12.350' },
              },
            },
            financial: {
              type: 'object',
              properties: {
                totalEarnings: { type: 'string', example: '95000.50' },
                totalSpending: { type: 'string', example: '85000.25' },
                netProfit: { type: 'string', example: '10000.25' },
                profitMargin: { type: 'number', example: 10 },
              },
            },
            balances: {
              type: 'object',
              properties: {
                etkBalance: { type: 'string', example: '45.750' },
                idrsBalance: { type: 'string', example: '50000.00' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiBearerAuth()
  async getTradingPerformance(
    @Request() req: User,
    @Query('days') days?: number,
  ) {
    const prosumerId = req.user.prosumerId;
    const analysisDays = days ? Number(days) : 30;

    const performance =
      await this.tradingAnalyticsService.getTradingPerformance(
        prosumerId,
        analysisDays,
      );

    return ResponseFormatter.success(
      performance,
      'Trading performance retrieved successfully',
    );
  }
}
