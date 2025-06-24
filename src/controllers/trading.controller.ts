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
import { EnergySettlementService } from '../services/energy-settlement.service';
import { WalletsService } from '../modules/Wallets/Wallets.service';
import { TradeOrdersCacheService } from '../modules/TradeOrdersCache/TradeOrdersCache.service';
import { MarketTradesService } from '../modules/MarketTrades/MarketTrades.service';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { OrderType } from '../common/enums';
import { ProsumersService } from 'src/modules/Prosumers/Prosumers.service';

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

interface MintTokenRequest {
  walletAddress: string;
  amount: number;
}

interface AuthorizeMeterRequest {
  ownerWalletAddress: string;
  meterId: string;
  meterAddress: string;
}

interface UpdateConversionRatioRequest {
  ownerWalletAddress: string;
  newRatio: number;
}

interface UpdateMinSettlementRequest {
  ownerWalletAddress: string;
  newMinWh: number;
}

interface ProcessSettlementRequest {
  walletAddress: string;
  meterId: string;
  prosumerAddress: string;
  netEnergyWh: number;
  settlementId: string;
}

@Controller('trading')
@UseGuards(JwtAuthGuard)
export class TradingController {
  constructor(
    private blockchainService: BlockchainService,
    private energySettlementService: EnergySettlementService,
    private walletsService: WalletsService,
    private tradeOrdersCacheService: TradeOrdersCacheService,
    private marketTradesService: MarketTradesService,
    private prosumersService: ProsumersService,
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

  // New endpoint for processing energy settlements
  @Post('settlement/process')
  async processEnergySettlement(
    @Body() body: ProcessSettlementRequest,
    @Request() req,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify wallet ownership
    await this.verifyWalletOwnership(body.walletAddress, prosumerId);

    const txHash = await this.blockchainService.processEnergySettlement(
      body.walletAddress,
      body.meterId,
      body.prosumerAddress,
      body.netEnergyWh,
      body.settlementId,
    );

    return {
      success: true,
      transactionHash: txHash,
      message: 'Energy settlement processed',
    };
  }

  // New endpoint for manual settlement trigger
  @Post('settlement/manual/:meterId')
  async manualSettlement(@Param('meterId') meterId: string, @Request() req) {
    const prosumerId = req.user.prosumerId;

    const txHash = await this.energySettlementService.manualSettlement(
      meterId,
      prosumerId,
    );

    return {
      success: true,
      transactionHash: txHash,
      message: txHash
        ? 'Manual settlement processed'
        : 'Settlement threshold not met',
    };
  }

  // New endpoint for minting ETK tokens
  @Post('tokens/etk/mint')
  async mintETKTokens(@Body() body: MintTokenRequest, @Request() req) {
    const prosumerId = req.user.prosumerId;

    // Verify wallet ownership
    await this.verifyWalletOwnership(body.walletAddress, prosumerId);

    const txHash = await this.blockchainService.mintETKTokens(
      body.walletAddress,
      body.amount,
    );

    return {
      success: true,
      transactionHash: txHash,
      message: 'ETK tokens minted',
    };
  }

  // New endpoint for minting IDRS tokens
  @Post('tokens/idrs/mint')
  async mintIDRSTokens(@Body() body: MintTokenRequest, @Request() req) {
    const prosumerId = req.user.prosumerId;

    // Verify wallet ownership
    await this.verifyWalletOwnership(body.walletAddress, prosumerId);

    const txHash = await this.blockchainService.mintIDRSTokens(
      body.walletAddress,
      body.amount,
    );

    return {
      success: true,
      transactionHash: txHash,
      message: 'IDRS tokens minted',
    };
  }

  // New endpoint for authorizing meters (admin function)
  @Post('meter/authorize')
  async authorizeMeter(@Body() body: AuthorizeMeterRequest, @Request() req) {
    const prosumerId = req.user.prosumerId;

    // Verify wallet ownership
    await this.verifyWalletOwnership(body.ownerWalletAddress, prosumerId);

    const txHash = await this.blockchainService.authorizeMeter(
      body.ownerWalletAddress,
      body.meterId,
      body.meterAddress,
    );

    return {
      success: true,
      transactionHash: txHash,
      message: 'Meter authorized for settlements',
    };
  }

  // New endpoint for updating conversion ratio (admin function)
  @Post('config/conversion-ratio')
  async updateConversionRatio(
    @Body() body: UpdateConversionRatioRequest,
    @Request() req,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify wallet ownership
    await this.verifyWalletOwnership(body.ownerWalletAddress, prosumerId);

    const txHash = await this.blockchainService.updateConversionRatio(
      body.ownerWalletAddress,
      body.newRatio,
    );

    return {
      success: true,
      transactionHash: txHash,
      message: 'Conversion ratio updated',
    };
  }

  // New endpoint for updating minimum settlement threshold (admin function)
  @Post('config/min-settlement')
  async updateMinSettlement(
    @Body() body: UpdateMinSettlementRequest,
    @Request() req,
  ) {
    const prosumerId = req.user.prosumerId;

    // Verify wallet ownership
    await this.verifyWalletOwnership(body.ownerWalletAddress, prosumerId);

    const txHash = await this.blockchainService.updateMinSettlement(
      body.ownerWalletAddress,
      body.newMinWh,
    );

    return {
      success: true,
      transactionHash: txHash,
      message: 'Minimum settlement threshold updated',
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

  // New endpoint for getting settlement history
  @Get('settlements')
  async getSettlementHistory(
    @Request() req,
    @Query('meterId') meterId?: string,
    @Query('limit') limit?: string,
  ) {
    const prosumerId = req.user.prosumerId;
    const maxLimit = limit ? parseInt(limit) : 50;

    const settlements = await this.energySettlementService.getSettlementHistory(
      meterId,
      prosumerId,
      maxLimit,
    );

    return {
      success: true,
      data: settlements,
    };
  }

  // New endpoint for getting blockchain settlement details
  @Get('settlement/:settlementId')
  async getBlockchainSettlement(@Param('settlementId') settlementId: string) {
    const settlement =
      await this.energySettlementService.getBlockchainSettlement(settlementId);

    return {
      success: true,
      data: settlement,
    };
  }

  // New endpoint for getting conversion ratio
  @Get('config/conversion-ratio')
  async getConversionRatio() {
    const ratio = await this.energySettlementService.getConversionRatio();

    return {
      success: true,
      data: { conversionRatio: ratio },
    };
  }

  // New endpoint for getting minimum settlement threshold
  @Get('config/min-settlement')
  async getMinSettlement() {
    const minWh =
      await this.energySettlementService.getMinimumSettlementThreshold();

    return {
      success: true,
      data: { minSettlementWh: minWh },
    };
  }

  // New endpoint for checking meter authorization
  @Get('meter/:meterId/authorization')
  async checkMeterAuthorization(@Param('meterId') meterId: string) {
    const isAuthorized =
      await this.energySettlementService.checkMeterAuthorization(meterId);

    return {
      success: true,
      data: { meterId, isAuthorized },
    };
  }

  // New endpoint for calculating ETK amount from energy
  @Get('calculate/etk/:energyWh')
  async calculateETKAmount(@Param('energyWh') energyWh: string) {
    const etkAmount = await this.blockchainService.calculateEtkAmount(
      parseInt(energyWh),
    );

    return {
      success: true,
      data: { energyWh: parseInt(energyWh), etkAmount },
    };
  }

  // New endpoint for calculating energy from ETK amount
  @Get('calculate/energy/:etkAmount')
  async calculateEnergyAmount(@Param('etkAmount') etkAmount: string) {
    const energyWh = await this.blockchainService.calculateEnergyWh(
      parseFloat(etkAmount),
    );

    return {
      success: true,
      data: { etkAmount: parseFloat(etkAmount), energyWh },
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

    // Get current blockchain market price
    const currentMarketPrice = await this.blockchainService.getMarketPrice();

    // Get token supply information
    const etkTotalSupply = await this.blockchainService.getETKTotalSupply();
    const idrsTotalSupply = await this.blockchainService.getIDRSTotalSupply();

    return {
      success: true,
      data: {
        lastPrice: lastTrade?.priceIdrsPerEtk || 0,
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

  private async verifyWalletOwnership(
    walletAddress: string,
    prosumerId: string,
  ) {
    try {
      const wallet = await this.walletsService.findOne(walletAddress);
      // const prosumers = await this.walletsService.findProsumers(walletAddress);
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
