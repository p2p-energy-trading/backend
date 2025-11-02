import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import MarketABI from '../../ABI/Market.json';
import { TransactionLogsService } from '../../models/transactionLog/transactionLog.service';
import { TradeOrdersCacheRedisService } from './trade-orders-cache-redis.service';
import { BlockchainConfig } from '../../common/interfaces';
import { TransactionType, OrderType } from '../../common/enums';

/**
 * Trading Market Service
 * Handles all market-related blockchain operations including:
 * - Order placement (buy/sell)
 * - Order cancellation
 * - Market data retrieval (price, liquidity, supply)
 * - Order status synchronization
 */
@Injectable()
export class TradingMarketService {
  private readonly logger = new Logger(TradingMarketService.name);
  private provider: ethers.JsonRpcProvider;
  private config: BlockchainConfig;

  // Market contract ABI
  private readonly marketABI = MarketABI;

  constructor(
    private readonly transactionLogsService: TransactionLogsService,
    private readonly tradeOrdersCacheService: TradeOrdersCacheRedisService,
  ) {}

  /**
   * Initialize the service with blockchain provider and config
   * This must be called by BlockchainService after instantiation
   */
  initialize(
    provider: ethers.JsonRpcProvider,
    config: BlockchainConfig,
    getWalletSignerFn: (address: string) => Promise<ethers.Wallet>,
    getUserIdByWalletFn: (address: string) => Promise<string | null>,
  ) {
    this.provider = provider;
    this.config = config;
    this.getWalletSigner = getWalletSignerFn;
    this.getUserIdByWallet = getUserIdByWalletFn;
    this.logger.log('TradingMarketService initialized');
  }

  /**
   * Get wallet signer for a user
   * Injected function from BlockchainService
   */
  private getWalletSigner: (walletAddress: string) => Promise<ethers.Wallet>;

  /**
   * Get user ID by wallet address
   * Injected function from BlockchainService
   */
  private getUserIdByWallet: (
    walletAddress: string,
  ) => Promise<string | null>;

  /**
   * Place a buy order on the market
   */
  async placeBuyOrder(
    walletAddress: string,
    quantity: number,
    price: number,
  ): Promise<string> {
    return this.placeOrder(walletAddress, quantity, price, true);
  }

  /**
   * Place a sell order on the market
   */
  async placeSellOrder(
    walletAddress: string,
    quantity: number,
    price: number,
  ): Promise<string> {
    return this.placeOrder(walletAddress, quantity, price, false);
  }

  /**
   * Internal method to place an order (buy or sell)
   */
  private async placeOrder(
    walletAddress: string,
    quantity: number,
    price: number,
    isBuy: boolean,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(walletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.market,
        this.marketABI,
        wallet,
      );

      // Generate UUID for the order
      const uuid = Math.floor(Math.random() * 1000000000000);

      // Both ETK and IDRS use 2 decimals now
      const amountWei = BigInt(Math.floor(quantity * 100)); // ETK uses 2 decimals
      const priceWei = BigInt(Math.floor(price * 100)); // IDRS uses 2 decimals

      const tx = (await contract.placeOrder(
        uuid,
        amountWei,
        priceWei,
        isBuy,
      )) as ethers.ContractTransactionResponse;

      // Log transaction
      await this.transactionLogsService.create({
        userId:
          (await this.getUserIdByWallet(walletAddress)) || 'UNKNOWN',
        transactionType: TransactionType.ORDER_PLACED,
        description: JSON.stringify({
          orderType: isBuy ? OrderType.BID : OrderType.ASK,
          quantity,
          price,
          uuid,
          txHash: tx.hash,
        }),
        amountPrimary: quantity,
        currencyPrimary: isBuy ? 'IDRS' : 'ETK',
        blockchainTxHash: tx.hash,
        transactionTimestamp: new Date().toISOString(),
      });

      return tx.hash;
    } catch (error) {
      this.logger.error('Error placing order:', error);
      throw error;
    }
  }

  /**
   * Get current market price
   */
  async getMarketPrice(): Promise<number> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.market,
        this.marketABI,
        this.provider,
      );

      const marketPrice = (await contract.getMarketPrice()) as bigint;
      return Number(marketPrice) / 100; // Convert from wei (2 decimals)
    } catch (error) {
      this.logger.error('Error getting market price:', error);
      throw error;
    }
  }

  /**
   * Get total ETK supply in the market
   */
  async getTotalETKSupplyInMarket(): Promise<number> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.market,
        this.marketABI,
        this.provider,
      );

      const etkSupply = (await contract.getTotalETKSupplyInMarket()) as bigint;
      return Number(etkSupply) / Math.pow(10, 18); // Convert from wei to ETK
    } catch (error) {
      this.logger.error('Error getting ETK supply in market:', error);
      throw error;
    }
  }

  /**
   * Get total IDRS supply in the market
   */
  async getTotalIDRSSupplyInMarket(): Promise<number> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.market,
        this.marketABI,
        this.provider,
      );

      const idrsSupply =
        (await contract.getTotalIDRSSupplyInMarket()) as bigint;
      return Number(idrsSupply) / Math.pow(10, 18); // Convert from wei to IDRS
    } catch (error) {
      this.logger.error('Error getting IDRS supply in market:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    walletAddress: string,
    orderId: string,
    isBuyOrder: boolean,
  ): Promise<string> {
    try {
      const wallet = await this.getWalletSigner(walletAddress);
      const contract = new ethers.Contract(
        this.config.contracts.market,
        this.marketABI,
        wallet,
      );

      const tx = (await contract.cancelOrder(
        orderId,
        isBuyOrder,
      )) as ethers.ContractTransactionResponse;

      return tx.hash;
    } catch (error) {
      this.logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Get order details from blockchain
   */
  async getOrderDetails(
    orderId: string,
    isBuyOrder: boolean,
  ): Promise<{
    id: string;
    user: string;
    amount: number;
    price: number;
    timestamp: number;
    exists: boolean;
  } | null> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.market,
        this.marketABI,
        this.provider,
      );

      const orderData = (
        isBuyOrder
          ? await contract.buyOrders(orderId)
          : await contract.sellOrders(orderId)
      ) as [bigint, string, bigint, bigint, bigint];

      // Order structure: (id, user, amount, price, timestamp)
      const [id, user, amount, price, timestamp] = orderData;

      // If id is 0, the order doesn't exist (was filled or cancelled)
      if (Number(id) === 0) {
        return {
          id: orderId,
          user: '',
          amount: 0,
          price: 0,
          timestamp: 0,
          exists: false,
        };
      }

      return {
        id: id.toString(),
        user: user,
        amount: Number(amount) / 100, // Convert from wei (2 decimals)
        price: Number(price) / 100, // Convert from wei (2 decimals)
        timestamp: Number(timestamp),
        exists: true,
      };
    } catch (error) {
      this.logger.error('Error getting order details:', error);
      return null;
    }
  }

  /**
   * Update order status in cache after a trade
   * @internal Used by event listeners
   */
  async updateOrderStatusInCache(
    orderId: string,
    isBuyOrder: boolean,
    matchedAmount: number,
    txHash: string | null,
  ): Promise<void> {
    try {
      // Get current order details from blockchain
      const orderDetails = await this.getOrderDetails(orderId, isBuyOrder);

      if (!orderDetails) {
        this.logger.error(`Failed to get order details for order ${orderId}`);
        return;
      }

      // Get current order from cache
      const cachedOrder = await this.tradeOrdersCacheService.findOne(orderId);

      if (!cachedOrder) {
        this.logger.warn(`Order ${orderId} not found in cache`);
        return;
      }

      let newStatus: string;
      let newAmount = cachedOrder.amountEtk;

      if (!orderDetails.exists) {
        // Order was fully filled (deleted from blockchain)
        newStatus = 'FILLED';
        newAmount = 0;
      } else if (orderDetails.amount < cachedOrder.amountEtk) {
        // Order was partially filled
        newStatus = 'PARTIALLY_FILLED';
        newAmount = orderDetails.amount;
      } else {
        // Order still open (shouldn't happen in transaction completed event)
        newStatus = 'OPEN';
      }

      // Update order in cache
      await this.tradeOrdersCacheService.update(orderId, {
        orderId: cachedOrder.orderId,
        userId: cachedOrder.userId,
        walletAddress: cachedOrder.walletAddress,
        orderType: cachedOrder.orderType,
        pair: cachedOrder.pair,
        amountEtk: newAmount,
        priceIdrsPerEtk: cachedOrder.priceIdrsPerEtk,
        totalIdrsValue: newAmount * cachedOrder.priceIdrsPerEtk,
        statusOnChain: newStatus,
        createdAtOnChain:
          cachedOrder.createdAtOnChain instanceof Date
            ? cachedOrder.createdAtOnChain.toISOString()
            : cachedOrder.createdAtOnChain,
        updatedAtCache: new Date().toISOString(),
        blockchainTxHashPlaced: cachedOrder.blockchainTxHashPlaced,
        blockchainTxHashFilled: txHash || cachedOrder.blockchainTxHashFilled,
      });

      this.logger.log(
        `Updated order ${orderId} status to ${newStatus}, remaining amount: ${newAmount} ETK`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating order status in cache for ${orderId}:`,
        error,
      );
    }
  }

  /**
   * Get market liquidity information
   */
  async getMarketLiquidity(): Promise<{
    etkSupply: number;
    idrsSupply: number;
    buyOrderCount: number;
    sellOrderCount: number;
  }> {
    try {
      const contract = new ethers.Contract(
        this.config.contracts.market,
        this.marketABI,
        this.provider,
      );

      const [etkSupply, idrsSupply, buyOrderCount, sellOrderCount] =
        (await contract.getMarketLiquidity()) as [
          bigint,
          bigint,
          bigint,
          bigint,
        ];

      return {
        etkSupply: Number(etkSupply) / 100, // Convert from wei (2 decimals)
        idrsSupply: Number(idrsSupply) / 100, // Convert from wei (2 decimals)
        buyOrderCount: Number(buyOrderCount),
        sellOrderCount: Number(sellOrderCount),
      };
    } catch (error) {
      this.logger.error('Error getting market liquidity:', error);
      throw error;
    }
  }
}
