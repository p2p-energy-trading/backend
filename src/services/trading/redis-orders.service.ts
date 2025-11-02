import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface OrderData {
  orderId: string;
  userId: string;
  walletAddress: string;
  orderType: string; // 'BID' | 'ASK'
  pair: string; // 'ETK/IDRS'
  amountEtk: number;
  priceIdrsPerEtk: number;
  totalIdrsValue: number;
  statusOnChain: string; // 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED'
  createdAtOnChain: string; // ISO 8601
  updatedAtCache: string; // ISO 8601
  blockchainTxHashPlaced?: string;
  blockchainTxHashFilled?: string;
  blockchainTxHashCancelled?: string;
}

/**
 * Redis Orders Service
 * Manages order book caching in Redis for high-performance trading operations
 *
 * Data Structure:
 * - Hash: orders:{orderId} - Full order details
 * - Sorted Set: orders:by_type:{BID|ASK} - Orders sorted by price (score = price * 100)
 * - Sorted Set: orders:by_user:{userId} - Orders per prosumer
 * - Sorted Set: orders:by_status:{status} - Orders by status
 * - Set: orders:all - Set of all order IDs for fast iteration
 *
 * TTL: Orders don't expire automatically but are removed when filled/cancelled
 */
@Injectable()
export class RedisOrdersService implements OnModuleInit {
  private readonly logger = new Logger(RedisOrdersService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisHost =
      this.configService.get<string>('REDIS_HOST') || 'localhost';
    const redisPort = this.configService.get<number>('REDIS_PORT') || 6379;
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    this.client = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });
  }

  /**
   * Get Redis client (for advanced operations)
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Create or update an order in Redis
   */
  async setOrder(order: OrderData): Promise<void> {
    const orderId = order.orderId;
    const pipeline = this.client.pipeline();

    // Store full order data in hash
    pipeline.hset(`orders:${orderId}`, {
      orderId: order.orderId,
      userId: order.userId,
      walletAddress: order.walletAddress,
      orderType: order.orderType,
      pair: order.pair,
      amountEtk: order.amountEtk.toString(),
      priceIdrsPerEtk: order.priceIdrsPerEtk.toString(),
      totalIdrsValue: order.totalIdrsValue.toString(),
      statusOnChain: order.statusOnChain,
      createdAtOnChain: order.createdAtOnChain,
      updatedAtCache: order.updatedAtCache,
      blockchainTxHashPlaced: order.blockchainTxHashPlaced || '',
      blockchainTxHashFilled: order.blockchainTxHashFilled || '',
      blockchainTxHashCancelled: order.blockchainTxHashCancelled || '',
    });

    // Add to all orders set
    pipeline.sadd('orders:all', orderId);

    // Add to sorted set by type (score = price for sorting)
    const priceScore = Math.floor(order.priceIdrsPerEtk * 100); // Convert to integer
    pipeline.zadd(`orders:by_type:${order.orderType}`, priceScore, orderId);

    // Add to sorted set by prosumer (score = timestamp)
    const timestamp = new Date(order.createdAtOnChain).getTime();
    pipeline.zadd(`orders:by_user:${order.userId}`, timestamp, orderId);

    // Add to sorted set by status
    pipeline.zadd(
      `orders:by_status:${order.statusOnChain}`,
      timestamp,
      orderId,
    );

    await pipeline.exec();
  }

  /**
   * Get an order by ID
   */
  async getOrder(orderId: string): Promise<OrderData | null> {
    const data = await this.client.hgetall(`orders:${orderId}`);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      orderId: data.orderId,
      userId: data.userId,
      walletAddress: data.walletAddress,
      orderType: data.orderType,
      pair: data.pair,
      amountEtk: parseFloat(data.amountEtk),
      priceIdrsPerEtk: parseFloat(data.priceIdrsPerEtk),
      totalIdrsValue: parseFloat(data.totalIdrsValue),
      statusOnChain: data.statusOnChain,
      createdAtOnChain: data.createdAtOnChain,
      updatedAtCache: data.updatedAtCache,
      blockchainTxHashPlaced: data.blockchainTxHashPlaced || undefined,
      blockchainTxHashFilled: data.blockchainTxHashFilled || undefined,
      blockchainTxHashCancelled: data.blockchainTxHashCancelled || undefined,
    };
  }

  /**
   * Get all orders (optionally filtered)
   */
  async getAllOrders(filter?: {
    orderType?: string;
    userId?: string;
    statusOnChain?: string;
  }): Promise<OrderData[]> {
    let orderIds: string[];

    if (filter?.orderType) {
      // Get orders by type
      orderIds = await this.client.zrange(
        `orders:by_type:${filter.orderType}`,
        0,
        -1,
      );
    } else if (filter?.userId) {
      // Get orders by prosumer
      orderIds = await this.client.zrange(
        `orders:by_user:${filter.userId}`,
        0,
        -1,
      );
    } else if (filter?.statusOnChain) {
      // Get orders by status
      orderIds = await this.client.zrange(
        `orders:by_status:${filter.statusOnChain}`,
        0,
        -1,
      );
    } else {
      // Get all orders
      orderIds = await this.client.smembers('orders:all');
    }

    if (orderIds.length === 0) {
      return [];
    }

    // Fetch all orders in parallel
    const orders = await Promise.all(orderIds.map((id) => this.getOrder(id)));

    return orders.filter((order): order is OrderData => order !== null);
  }

  /**
   * Get open or partially filled orders
   */
  async getOpenOrPartiallyFilledOrders(): Promise<OrderData[]> {
    const openOrders = await this.client.zrange('orders:by_status:OPEN', 0, -1);
    const partialOrders = await this.client.zrange(
      'orders:by_status:PARTIALLY_FILLED',
      0,
      -1,
    );

    const allOrderIds = [...openOrders, ...partialOrders];

    if (allOrderIds.length === 0) {
      return [];
    }

    const orders = await Promise.all(
      allOrderIds.map((id) => this.getOrder(id)),
    );

    return orders.filter((order): order is OrderData => order !== null);
  }

  /**
   * Update an order (partial update)
   */
  async updateOrder(
    orderId: string,
    updates: Partial<OrderData>,
  ): Promise<OrderData | null> {
    const existing = await this.getOrder(orderId);

    if (!existing) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Merge updates
    const updated: OrderData = {
      ...existing,
      ...updates,
      orderId: existing.orderId, // Ensure orderId doesn't change
      updatedAtCache: new Date().toISOString(),
    };

    // If status changed, update sorted sets
    if (
      updates.statusOnChain &&
      updates.statusOnChain !== existing.statusOnChain
    ) {
      const pipeline = this.client.pipeline();

      // Remove from old status set
      pipeline.zrem(`orders:by_status:${existing.statusOnChain}`, orderId);

      // Add to new status set
      const timestamp = new Date(updated.createdAtOnChain).getTime();
      pipeline.zadd(
        `orders:by_status:${updates.statusOnChain}`,
        timestamp,
        orderId,
      );

      await pipeline.exec();
    }

    // If price changed, update type sorted set
    if (
      updates.priceIdrsPerEtk &&
      updates.priceIdrsPerEtk !== existing.priceIdrsPerEtk
    ) {
      const priceScore = Math.floor(updated.priceIdrsPerEtk * 100);
      await this.client.zadd(
        `orders:by_type:${updated.orderType}`,
        priceScore,
        orderId,
      );
    }

    // Save updated order
    await this.setOrder(updated);

    return updated;
  }

  /**
   * Delete an order
   */
  async deleteOrder(orderId: string): Promise<boolean> {
    const existing = await this.getOrder(orderId);

    if (!existing) {
      return false;
    }

    const pipeline = this.client.pipeline();

    // Delete order hash
    pipeline.del(`orders:${orderId}`);

    // Remove from all sets
    pipeline.srem('orders:all', orderId);
    pipeline.zrem(`orders:by_type:${existing.orderType}`, orderId);
    pipeline.zrem(`orders:by_user:${existing.userId}`, orderId);
    pipeline.zrem(`orders:by_status:${existing.statusOnChain}`, orderId);

    await pipeline.exec();

    return true;
  }

  /**
   * Get order count by type
   */
  async getOrderCountByType(): Promise<{ BID: number; ASK: number }> {
    const [bidCount, askCount] = await Promise.all([
      this.client.zcard('orders:by_type:BID'),
      this.client.zcard('orders:by_type:ASK'),
    ]);

    return { BID: bidCount, ASK: askCount };
  }

  /**
   * Get order count by status
   */
  async getOrderCountByStatus(): Promise<Record<string, number>> {
    const statuses = ['OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED'];

    const counts = await Promise.all(
      statuses.map(async (status) => ({
        status,
        count: await this.client.zcard(`orders:by_status:${status}`),
      })),
    );

    return counts.reduce(
      (acc, { status, count }) => {
        acc[status] = count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Clear all orders (use with caution!)
   */
  async clearAllOrders(): Promise<void> {
    const orderIds = await this.client.smembers('orders:all');

    if (orderIds.length === 0) {
      return;
    }

    const pipeline = this.client.pipeline();

    // Delete all order hashes
    for (const orderId of orderIds) {
      pipeline.del(`orders:${orderId}`);
    }

    // Delete all sets
    pipeline.del('orders:all');
    pipeline.del('orders:by_type:BID');
    pipeline.del('orders:by_type:ASK');
    pipeline.del('orders:by_status:OPEN');
    pipeline.del('orders:by_status:PARTIALLY_FILLED');
    pipeline.del('orders:by_status:FILLED');
    pipeline.del('orders:by_status:CANCELLED');

    // Delete prosumer sets (use scan for safety)
    const prosumerKeys = await this.client.keys('orders:by_user:*');
    for (const key of prosumerKeys) {
      pipeline.del(key);
    }

    await pipeline.exec();

    this.logger.log('Cleared all orders from Redis');
  }

  /**
   * Ping Redis to check connectivity
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping failed:', error);
      return false;
    }
  }

  /**
   * Get Redis stats
   */
  async getStats(): Promise<{
    totalOrders: number;
    ordersByType: { BID: number; ASK: number };
    ordersByStatus: Record<string, number>;
  }> {
    const [totalOrders, ordersByType, ordersByStatus] = await Promise.all([
      this.client.scard('orders:all'),
      this.getOrderCountByType(),
      this.getOrderCountByStatus(),
    ]);

    return {
      totalOrders,
      ordersByType,
      ordersByStatus,
    };
  }
}
