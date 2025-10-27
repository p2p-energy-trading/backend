import { Injectable, Logger } from '@nestjs/common';
import { RedisOrdersService, OrderData } from './redis-orders.service';
import { CreateTradeOrdersCacheInput } from '../../models/tradeOrdersCache/dto/TradeOrdersCache.input';
import { TradeOrdersCacheArgs } from '../../models/tradeOrdersCache/dto/TradeOrdersCache.args';

/**
 * Redis-backed Trade Orders Cache Service
 * Drop-in replacement for TradeOrdersCacheService using Redis instead of PostgreSQL
 *
 * This service provides the same interface as TradeOrdersCacheService but uses
 * RedisOrdersService for storage, providing:
 * - Much faster read/write performance
 * - Lower database load
 * - Real-time order book updates
 * - Automatic expiration (optional)
 */
@Injectable()
export class TradeOrdersCacheRedisService {
  private readonly logger = new Logger(TradeOrdersCacheRedisService.name);

  constructor(private readonly redisOrdersService: RedisOrdersService) {}

  /**
   * Find all orders with optional filtering
   */
  async findAll(args?: TradeOrdersCacheArgs): Promise<any[]> {
    try {
      let orders: OrderData[];

      // Apply filters
      if (args?.orderType) {
        orders = await this.redisOrdersService.getAllOrders({
          orderType: args.orderType,
        });
      } else if (args?.prosumerId) {
        orders = await this.redisOrdersService.getAllOrders({
          prosumerId: args.prosumerId,
        });
      } else if (args?.statusOnChain) {
        orders = await this.redisOrdersService.getAllOrders({
          statusOnChain: args.statusOnChain,
        });
      } else {
        orders = await this.redisOrdersService.getAllOrders();
      }

      // Additional client-side filtering for fields not indexed in Redis
      if (args?.walletAddress) {
        orders = orders.filter((o) => o.walletAddress === args.walletAddress);
      }
      if (args?.pair) {
        orders = orders.filter((o) => o.pair === args.pair);
      }
      if (args?.amountEtk !== undefined) {
        orders = orders.filter((o) => o.amountEtk === args.amountEtk);
      }
      if (args?.priceIdrsPerEtk !== undefined) {
        orders = orders.filter(
          (o) => o.priceIdrsPerEtk === args.priceIdrsPerEtk,
        );
      }

      return orders;
    } catch (error) {
      this.logger.error('Error finding all orders:', error);
      return [];
    }
  }

  /**
   * Find open or partially filled orders
   */
  async findOpenOrPartiallyFilledOrders(): Promise<any[]> {
    try {
      return await this.redisOrdersService.getOpenOrPartiallyFilledOrders();
    } catch (error) {
      this.logger.error('Error finding open/partially filled orders:', error);
      return [];
    }
  }

  /**
   * Find one order by ID
   */
  async findOne(orderId: string): Promise<any> {
    try {
      const order = await this.redisOrdersService.getOrder(orderId);

      if (!order) {
        throw new Error(`Order with orderId ${orderId} not found`);
      }

      return order;
    } catch (error) {
      this.logger.error(`Error finding order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new order
   */
  async create(input: CreateTradeOrdersCacheInput): Promise<any> {
    try {
      const orderData: OrderData = {
        orderId: input.orderId,
        prosumerId: input.prosumerId,
        walletAddress: input.walletAddress,
        orderType: input.orderType,
        pair: input.pair,
        amountEtk: input.amountEtk,
        priceIdrsPerEtk: input.priceIdrsPerEtk,
        totalIdrsValue: input.totalIdrsValue ?? 0,
        statusOnChain: input.statusOnChain,
        createdAtOnChain: input.createdAtOnChain || new Date().toISOString(),
        updatedAtCache: input.updatedAtCache || new Date().toISOString(),
        blockchainTxHashPlaced: input.blockchainTxHashPlaced || '',
        blockchainTxHashFilled: input.blockchainTxHashFilled || '',
        blockchainTxHashCancelled: '',
      };

      await this.redisOrdersService.setOrder(orderData);

      this.logger.log(`Created order ${input.orderId} in Redis`);

      return orderData;
    } catch (error) {
      this.logger.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Update an existing order
   */
  async update(
    orderId: string,
    input: CreateTradeOrdersCacheInput,
  ): Promise<any> {
    try {
      // Build updates object with only defined values
      const updates: Partial<OrderData> = {};

      if (input.prosumerId !== undefined) updates.prosumerId = input.prosumerId;
      if (input.walletAddress !== undefined)
        updates.walletAddress = input.walletAddress;
      if (input.orderType !== undefined) updates.orderType = input.orderType;
      if (input.pair !== undefined) updates.pair = input.pair;
      if (input.amountEtk !== undefined) updates.amountEtk = input.amountEtk;
      if (input.priceIdrsPerEtk !== undefined)
        updates.priceIdrsPerEtk = input.priceIdrsPerEtk;
      if (input.totalIdrsValue !== undefined)
        updates.totalIdrsValue = input.totalIdrsValue;
      if (input.statusOnChain !== undefined)
        updates.statusOnChain = input.statusOnChain;
      if (input.createdAtOnChain !== undefined)
        updates.createdAtOnChain = input.createdAtOnChain;
      if (input.blockchainTxHashPlaced !== undefined)
        updates.blockchainTxHashPlaced = input.blockchainTxHashPlaced;
      if (input.blockchainTxHashFilled !== undefined)
        updates.blockchainTxHashFilled = input.blockchainTxHashFilled;
      if (input.blockchainTxHashCancelled !== undefined)
        updates.blockchainTxHashCancelled = input.blockchainTxHashCancelled;

      const updated = await this.redisOrdersService.updateOrder(
        orderId,
        updates,
      );

      if (!updated) {
        throw new Error(`Order ${orderId} not found for update`);
      }

      this.logger.log(`Updated order ${orderId} in Redis`);

      return updated;
    } catch (error) {
      this.logger.error(`Error updating order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Remove an order
   */
  async remove(orderId: string): Promise<boolean> {
    try {
      const result = await this.redisOrdersService.deleteOrder(orderId);

      if (result) {
        this.logger.log(`Removed order ${orderId} from Redis`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error removing order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Get statistics about orders in Redis
   */
  async getStats() {
    try {
      return await this.redisOrdersService.getStats();
    } catch (error) {
      this.logger.error('Error getting stats:', error);
      return {
        totalOrders: 0,
        ordersByType: { BID: 0, ASK: 0 },
        ordersByStatus: {},
      };
    }
  }
}
