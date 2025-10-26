import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { MarketTradesService } from '../models/MarketTrades/MarketTrades.service';
import { BlockchainService } from './blockchain.service';

interface PricePoint {
  timestamp: string;
  price: number;
  volume: number;
}

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
}

@Injectable()
export class PriceCacheService implements OnModuleInit {
  private readonly logger = new Logger(PriceCacheService.name);
  private redisClient: Redis;

  // Redis key patterns
  private readonly PRICE_KEY_PREFIX = 'price:history'; // Sorted Set: price_1s, price_1m, etc.
  private readonly CANDLE_KEY_PREFIX = 'price:candles'; // Sorted Set: candles_1m, candles_5m, etc.
  private readonly CURRENT_PRICE_KEY = 'price:current'; // String: latest price

  // TTL configurations (in seconds)
  private readonly TTL_CONFIG = {
    '1s': 3600, // 1 hour
    '1m': 86400, // 24 hours
    '5m': 604800, // 1 week
    '1h': 2592000, // 30 days
  };

  private readonly MAX_CACHE_SIZE = {
    '1s': 3600, // 1 hour at 1s intervals
    '1m': 1440, // 24 hours at 1m intervals
    '5m': 2016, // 1 week at 5m intervals
    '1h': 720, // 30 days at 1h intervals
  };

  constructor(
    private configService: ConfigService,
    private marketTradesService: MarketTradesService,
    private blockchainService: BlockchainService,
  ) {}

  async onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    this.redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(
          `Redis connection retry attempt ${times}, delay: ${delay}ms`,
        );
        return delay;
      },
    });

    this.redisClient.on('connect', () => {
      this.logger.log(
        `Price Cache connected to Redis at ${redisHost}:${redisPort}`,
      );
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    // Initialize historical data in background
    void this.initializeHistoricalData();
  }

  @Cron(CronExpression.EVERY_SECOND)
  async updatePriceCache() {
    try {
      // Get current price from blockchain
      const currentPrice = await this.blockchainService.getMarketPrice();
   
      const now = new Date().toISOString();
      // Get recent trades volume (last minute)
      const recentTrades = await this.marketTradesService.findRecentTrades(10);
      const lastMinuteVolume = recentTrades
        .filter((trade) => {
          const tradeTime = new Date(trade.tradeTimestamp);
          const oneMinuteAgo = new Date(Date.now() - 60000);
          return tradeTime > oneMinuteAgo;
        })
        .reduce((sum, trade) => sum + Number(trade.tradedEtkAmount), 0);

      const pricePoint: PricePoint = {
        timestamp: now,
        price: currentPrice,
        volume: lastMinuteVolume,
      };

      // Store current price
      await this.redisClient.set(
        this.CURRENT_PRICE_KEY,
        currentPrice.toString(),
        'EX',
        60, // 1 minute TTL
      );

      // Add to 1-second cache
      await this.addToPriceCache('price_1s', pricePoint);

      // Generate minute candles from seconds if needed
      void this.generateMinuteCandles();
    } catch (error) {
      this.logger.error('Error updating price cache:', error);
    }
  }

  @Cron('0 * * * * *') // Every minute
  async generateMinuteCandles() {
    try {
      const now = new Date();
      const currentMinute = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
      );
      const lastMinute = new Date(currentMinute.getTime() - 60000);

      // Get points from last complete minute from Redis
      const lastMinutePoints = await this.getPricePointsInRange(
        'price_1s',
        lastMinute.getTime(),
        currentMinute.getTime(),
      );

      if (lastMinutePoints.length > 0) {
        const candle: CandleData = {
          time: lastMinute.toISOString(),
          open: lastMinutePoints[0].price,
          high: Math.max(...lastMinutePoints.map((p) => p.price)),
          low: Math.min(...lastMinutePoints.map((p) => p.price)),
          close: lastMinutePoints[lastMinutePoints.length - 1].price,
          volume: lastMinutePoints.reduce((sum, p) => sum + p.volume, 0),
        };

        await this.addToCandleCache('candles_1m', candle);
      }

      // Generate 5-minute candles from 1-minute candles
      void this.generate5MinuteCandles();
    } catch (error) {
      this.logger.error('Error generating minute candles:', error);
    }
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  async generate5MinuteCandles() {
    try {
      const now = new Date();
      const current5Min = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        Math.floor(now.getMinutes() / 5) * 5,
      );
      const last5Min = new Date(current5Min.getTime() - 5 * 60000);

      // Get candles from last complete 5-minute period
      const last5MinCandles = await this.getCandlesInRange(
        'candles_1m',
        last5Min.getTime(),
        current5Min.getTime(),
      );

      if (last5MinCandles.length > 0) {
        const candle5Min: CandleData = {
          time: last5Min.toISOString(),
          open: last5MinCandles[0].open,
          high: Math.max(...last5MinCandles.map((c) => c.high)),
          low: Math.min(...last5MinCandles.map((c) => c.low)),
          close: last5MinCandles[last5MinCandles.length - 1].close,
          volume: last5MinCandles.reduce((sum, c) => sum + c.volume, 0),
        };

        await this.addToCandleCache('candles_5m', candle5Min);
      }
    } catch (error) {
      this.logger.error('Error generating 5-minute candles:', error);
    }
  }

  @Cron('0 * * * * *') // Every minute
  generatePricePoints() {
    try {
      // Generate 1-minute price points from 1-second data
      void this.generate1MinutePricePoints();

      // Generate 5-minute price points from 1-minute data
      void this.generate5MinutePricePoints();

      // Generate 1-hour price points from 5-minute data
      void this.generate1HourPricePoints();
    } catch (error) {
      this.logger.error('Error generating price points:', error);
    }
  }

  private async generate1MinutePricePoints() {
    try {
      const now = new Date();
      const currentMinute = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        0,
        0,
      );
      const lastMinute = new Date(currentMinute.getTime() - 60000);

      // Check if we already have data for this minute
      const existingMinuteData = await this.getPricePointAtTime(
        'price_1m',
        lastMinute.getTime(),
      );

      if (existingMinuteData) {
        return; // Skip if we already have data for this minute
      }

      // Get points from last complete minute
      const lastMinutePoints = await this.getPricePointsInRange(
        'price_1s',
        lastMinute.getTime(),
        currentMinute.getTime(),
      );

      if (lastMinutePoints.length > 0) {
        // Calculate average price and total volume for the minute
        const avgPrice =
          lastMinutePoints.reduce((sum, p) => sum + p.price, 0) /
          lastMinutePoints.length;
        const totalVolume = lastMinutePoints.reduce(
          (sum, p) => sum + p.volume,
          0,
        );

        const pricePoint: PricePoint = {
          timestamp: lastMinute.toISOString(),
          price: avgPrice,
          volume: totalVolume,
        };

        await this.addToPriceCache('price_1m', pricePoint);
        this.logger.log(
          `Generated 1-minute price point for ${lastMinute.toISOString()}: price=${avgPrice}, volume=${totalVolume}`,
        );
      }
    } catch (error) {
      this.logger.error('Error generating 1-minute price points:', error);
    }
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  private async generate5MinutePricePoints() {
    try {
      const now = new Date();
      const current5Min = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        Math.floor(now.getMinutes() / 5) * 5,
        0,
        0,
      );
      const last5Min = new Date(current5Min.getTime() - 5 * 60000);

      // Check if we already have data for this 5-minute period
      const existing5MinData = await this.getPricePointAtTime(
        'price_5m',
        last5Min.getTime(),
      );

      if (existing5MinData) {
        return; // Skip if we already have data for this 5-minute period
      }

      // Get points from last complete 5-minute period
      const last5MinPoints = await this.getPricePointsInRange(
        'price_1m',
        last5Min.getTime(),
        current5Min.getTime(),
      );

      if (last5MinPoints.length > 0) {
        // Calculate average price and total volume for the 5-minute period
        const avgPrice =
          last5MinPoints.reduce((sum, p) => sum + p.price, 0) /
          last5MinPoints.length;
        const totalVolume = last5MinPoints.reduce(
          (sum, p) => sum + p.volume,
          0,
        );

        const pricePoint: PricePoint = {
          timestamp: last5Min.toISOString(),
          price: avgPrice,
          volume: totalVolume,
        };

        await this.addToPriceCache('price_5m', pricePoint);
        this.logger.log(
          `Generated 5-minute price point for ${last5Min.toISOString()}: price=${avgPrice}, volume=${totalVolume}`,
        );
      }
    } catch (error) {
      this.logger.error('Error generating 5-minute price points:', error);
    }
  }

  @Cron('0 0 * * * *') // Every hour
  private async generate1HourPricePoints() {
    try {
      const now = new Date();
      const currentHour = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        0,
        0,
        0,
      );
      const lastHour = new Date(currentHour.getTime() - 60 * 60000);

      // Check if we already have data for this hour
      const existingHourData = await this.getPricePointAtTime(
        'price_1h',
        lastHour.getTime(),
      );

      if (existingHourData) {
        return; // Skip if we already have data for this hour
      }

      // Get points from last complete hour
      const lastHourPoints = await this.getPricePointsInRange(
        'price_5m',
        lastHour.getTime(),
        currentHour.getTime(),
      );

      if (lastHourPoints.length > 0) {
        // Calculate average price and total volume for the hour
        const avgPrice =
          lastHourPoints.reduce((sum, p) => sum + p.price, 0) /
          lastHourPoints.length;
        const totalVolume = lastHourPoints.reduce(
          (sum, p) => sum + p.volume,
          0,
        );

        const pricePoint: PricePoint = {
          timestamp: lastHour.toISOString(),
          price: avgPrice,
          volume: totalVolume,
        };

        await this.addToPriceCache('price_1h', pricePoint);
        this.logger.log(
          `Generated 1-hour price point for ${lastHour.toISOString()}: price=${avgPrice}, volume=${totalVolume}`,
        );
      }
    } catch (error) {
      this.logger.error('Error generating 1-hour price points:', error);
    }
  }

  /**
   * Add price point to Redis sorted set
   */
  private async addToPriceCache(
    cacheKey: string,
    pricePoint: PricePoint,
  ): Promise<void> {
    try {
      const redisKey = `${this.PRICE_KEY_PREFIX}:${cacheKey}`;
      const score = new Date(pricePoint.timestamp).getTime();

      // Add to sorted set
      await this.redisClient.zadd(redisKey, score, JSON.stringify(pricePoint));

      // Set TTL based on interval
      const interval = cacheKey.split('_')[1] as keyof typeof this.TTL_CONFIG;
      const ttl = this.TTL_CONFIG[interval] || 3600;
      await this.redisClient.expire(redisKey, ttl);

      // Trim to max size
      const maxSize =
        this.MAX_CACHE_SIZE[interval as keyof typeof this.MAX_CACHE_SIZE] ||
        1000;
      const currentSize = await this.redisClient.zcard(redisKey);
      if (currentSize > maxSize) {
        // Remove oldest entries
        await this.redisClient.zremrangebyrank(
          redisKey,
          0,
          currentSize - maxSize - 1,
        );
      }
    } catch (error) {
      this.logger.error(`Error adding to price cache ${cacheKey}:`, error);
      throw error;
    }
  }

  /**
   * Add candle to Redis sorted set
   */
  private async addToCandleCache(
    cacheKey: string,
    candle: CandleData,
  ): Promise<void> {
    try {
      const redisKey = `${this.CANDLE_KEY_PREFIX}:${cacheKey}`;
      const score = new Date(candle.time).getTime();

      // Add to sorted set
      await this.redisClient.zadd(redisKey, score, JSON.stringify(candle));

      // Set TTL based on interval
      const interval = cacheKey.split('_')[1] as keyof typeof this.TTL_CONFIG;
      const ttl = this.TTL_CONFIG[interval] || 3600;
      await this.redisClient.expire(redisKey, ttl);

      // Trim to max size
      const maxSize =
        this.MAX_CACHE_SIZE[interval as keyof typeof this.MAX_CACHE_SIZE] ||
        1000;
      const currentSize = await this.redisClient.zcard(redisKey);
      if (currentSize > maxSize) {
        await this.redisClient.zremrangebyrank(
          redisKey,
          0,
          currentSize - maxSize - 1,
        );
      }
    } catch (error) {
      this.logger.error(`Error adding to candle cache ${cacheKey}:`, error);
      throw error;
    }
  }

  /**
   * Get price history from Redis
   */
  async getPriceHistory(
    interval: string,
    limit: number,
  ): Promise<PricePoint[]> {
    try {
      const redisKey = `${this.PRICE_KEY_PREFIX}:price_${interval}`;
      // Get last N entries (most recent)
      const results = await this.redisClient.zrevrange(redisKey, 0, limit - 1);
      return results.map((item) => JSON.parse(item)).reverse();
    } catch (error) {
      this.logger.error(`Error getting price history for ${interval}:`, error);
      return [];
    }
  }

  /**
   * Get price candles from Redis
   */
  async getPriceCandles(
    interval: string,
    limit: number,
  ): Promise<CandleData[]> {
    try {
      const redisKey = `${this.CANDLE_KEY_PREFIX}:candles_${interval}`;
      // Get last N entries (most recent)
      const results = await this.redisClient.zrevrange(redisKey, 0, limit - 1);
      return results.map((item) => JSON.parse(item)).reverse();
    } catch (error) {
      this.logger.error(`Error getting candles for ${interval}:`, error);
      return [];
    }
  }

  /**
   * Get current price from Redis
   */
  async getCurrentPrice(): Promise<number> {
    try {
      const priceStr = await this.redisClient.get(this.CURRENT_PRICE_KEY);
      return priceStr ? parseFloat(priceStr) : 0;
    } catch (error) {
      this.logger.error('Error getting current price:', error);
      return 0;
    }
  }

  /**
   * Get latest candle from Redis
   */
  async getLatestCandle(interval: string): Promise<CandleData | null> {
    try {
      const redisKey = `${this.CANDLE_KEY_PREFIX}:candles_${interval}`;
      // Get the most recent candle
      const results = await this.redisClient.zrevrange(redisKey, 0, 0);
      return results.length > 0 ? JSON.parse(results[0]) : null;
    } catch (error) {
      this.logger.error(`Error getting latest candle for ${interval}:`, error);
      return null;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupCache() {
    try {
      // Redis handles TTL automatically, but we can manually trim if needed
      const intervals = ['1s', '1m', '5m', '1h'];

      for (const interval of intervals) {
        const priceKey = `${this.PRICE_KEY_PREFIX}:price_${interval}`;
        const candleKey = `${this.CANDLE_KEY_PREFIX}:candles_${interval}`;

        const maxSize =
          this.MAX_CACHE_SIZE[interval as keyof typeof this.MAX_CACHE_SIZE] ||
          1000;

        // Trim price cache
        const priceSize = await this.redisClient.zcard(priceKey);
        if (priceSize > maxSize) {
          await this.redisClient.zremrangebyrank(
            priceKey,
            0,
            priceSize - maxSize - 1,
          );
          this.logger.log(
            `Trimmed ${priceSize - maxSize} entries from ${priceKey}`,
          );
        }

        // Trim candle cache
        const candleSize = await this.redisClient.zcard(candleKey);
        if (candleSize > maxSize) {
          await this.redisClient.zremrangebyrank(
            candleKey,
            0,
            candleSize - maxSize - 1,
          );
          this.logger.log(
            `Trimmed ${candleSize - maxSize} entries from ${candleKey}`,
          );
        }
      }

      this.logger.log('Cache cleanup completed');
    } catch (error) {
      this.logger.error('Error during cache cleanup:', error);
    }
  }

  /**
   * Clean duplicate entries is handled automatically by Redis sorted sets
   * (same score overwrites existing entry)
   */
  cleanupDuplicates() {
    // No longer needed with Redis sorted sets
    this.logger.log('Duplicate cleanup not needed with Redis sorted sets');
  }

  async initializeHistoricalData() {
    try {
      this.logger.log('Initializing historical price data in Redis...');

      // Clean up any existing duplicates (Redis handles this automatically)
      this.cleanupDuplicates();

      // Initialize 1-minute data from database if cache is empty
      await this.backfill1MinuteData();

      // Initialize 5-minute data from 1-minute cache
      await this.backfill5MinuteData();

      // Initialize 1-hour data from 5-minute cache
      await this.backfill1HourData();

      this.logger.log('Historical price data initialization completed');
    } catch (error) {
      this.logger.error('Error initializing historical data:', error);
    }
  }

  private async backfill1MinuteData() {
    try {
      // Check if we already have data
      const existingCount = await this.redisClient.zcard(
        `${this.PRICE_KEY_PREFIX}:price_1m`,
      );
      if (existingCount > 0) {
        this.logger.log('1-minute data already exists, skipping backfill');
        return;
      }

      // Get recent trades for the last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const now = new Date();

      const historicalCandles = await this.marketTradesService.getPriceHistory(
        '1m',
        1440, // 24 hours of minutes
        yesterday,
        now,
      );

      // Convert candles to price points and add to cache
      for (const candle of historicalCandles) {
        const pricePoint: PricePoint = {
          timestamp: candle.time,
          price: candle.close, // Use close price as the minute price
          volume: candle.volume,
        };
        await this.addToPriceCache('price_1m', pricePoint);
      }

      this.logger.log(
        `Backfilled ${historicalCandles.length} 1-minute price points`,
      );
    } catch (error) {
      this.logger.error('Error backfilling 1-minute data:', error);
    }
  }

  private async backfill5MinuteData() {
    try {
      // Check if we already have data
      const existingCount = await this.redisClient.zcard(
        `${this.PRICE_KEY_PREFIX}:price_5m`,
      );
      if (existingCount > 0) {
        this.logger.log('5-minute data already exists, skipping backfill');
        return;
      }

      // Get all 1-minute data from Redis
      const minutePoints = await this.getPriceHistory('1m', 1440);
      if (minutePoints.length === 0) {
        this.logger.log('No 1-minute data available for 5-minute backfill');
        return;
      }

      // Group minute data into 5-minute intervals
      const fiveMinGroups = new Map<string, PricePoint[]>();

      minutePoints.forEach((point) => {
        const timestamp = new Date(point.timestamp);
        const fiveMinBucket = new Date(
          timestamp.getFullYear(),
          timestamp.getMonth(),
          timestamp.getDate(),
          timestamp.getHours(),
          Math.floor(timestamp.getMinutes() / 5) * 5,
        );
        const bucketKey = fiveMinBucket.toISOString();

        if (!fiveMinGroups.has(bucketKey)) {
          fiveMinGroups.set(bucketKey, []);
        }
        fiveMinGroups.get(bucketKey)!.push(point);
      });

      // Create 5-minute price points
      for (const [timestamp, points] of fiveMinGroups.entries()) {
        if (points.length > 0) {
          const avgPrice =
            points.reduce((sum, p) => sum + p.price, 0) / points.length;
          const totalVolume = points.reduce((sum, p) => sum + p.volume, 0);

          const pricePoint: PricePoint = {
            timestamp,
            price: avgPrice,
            volume: totalVolume,
          };

          await this.addToPriceCache('price_5m', pricePoint);
        }
      }

      this.logger.log(
        `Backfilled ${fiveMinGroups.size} 5-minute price points`,
      );
    } catch (error) {
      this.logger.error('Error backfilling 5-minute data:', error);
    }
  }

  private async backfill1HourData() {
    try {
      // Check if we already have data
      const existingCount = await this.redisClient.zcard(
        `${this.PRICE_KEY_PREFIX}:price_1h`,
      );
      if (existingCount > 0) {
        this.logger.log('1-hour data already exists, skipping backfill');
        return;
      }

      // Get all 5-minute data from Redis
      const fiveMinPoints = await this.getPriceHistory('5m', 2016);
      if (fiveMinPoints.length === 0) {
        this.logger.log('No 5-minute data available for 1-hour backfill');
        return;
      }

      // Group 5-minute data into hourly intervals
      const hourGroups = new Map<string, PricePoint[]>();

      fiveMinPoints.forEach((point) => {
        const timestamp = new Date(point.timestamp);
        const hourBucket = new Date(
          timestamp.getFullYear(),
          timestamp.getMonth(),
          timestamp.getDate(),
          timestamp.getHours(),
          0,
        );
        const bucketKey = hourBucket.toISOString();

        if (!hourGroups.has(bucketKey)) {
          hourGroups.set(bucketKey, []);
        }
        hourGroups.get(bucketKey)!.push(point);
      });

      // Create hourly price points
      for (const [timestamp, points] of hourGroups.entries()) {
        if (points.length > 0) {
          const avgPrice =
            points.reduce((sum, p) => sum + p.price, 0) / points.length;
          const totalVolume = points.reduce((sum, p) => sum + p.volume, 0);

          const pricePoint: PricePoint = {
            timestamp,
            price: avgPrice,
            volume: totalVolume,
          };

          await this.addToPriceCache('price_1h', pricePoint);
        }
      }

      this.logger.log(`Backfilled ${hourGroups.size} 1-hour price points`);
    } catch (error) {
      this.logger.error('Error backfilling 1-hour data:', error);
    }
  }

  /**
   * Helper: Get price points within a time range from Redis
   */
  private async getPricePointsInRange(
    cacheKey: string,
    startTime: number,
    endTime: number,
  ): Promise<PricePoint[]> {
    try {
      const redisKey = `${this.PRICE_KEY_PREFIX}:${cacheKey}`;
      const results = await this.redisClient.zrangebyscore(
        redisKey,
        startTime,
        endTime,
      );
      return results.map((item) => JSON.parse(item));
    } catch (error) {
      this.logger.error(
        `Error getting price points in range for ${cacheKey}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Helper: Get candles within a time range from Redis
   */
  private async getCandlesInRange(
    cacheKey: string,
    startTime: number,
    endTime: number,
  ): Promise<CandleData[]> {
    try {
      const redisKey = `${this.CANDLE_KEY_PREFIX}:${cacheKey}`;
      const results = await this.redisClient.zrangebyscore(
        redisKey,
        startTime,
        endTime,
      );
      return results.map((item) => JSON.parse(item));
    } catch (error) {
      this.logger.error(
        `Error getting candles in range for ${cacheKey}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Helper: Get a specific price point at a given time from Redis
   */
  private async getPricePointAtTime(
    cacheKey: string,
    timestamp: number,
  ): Promise<PricePoint | null> {
    try {
      const redisKey = `${this.PRICE_KEY_PREFIX}:${cacheKey}`;
      // Get entries with exact timestamp
      const results = await this.redisClient.zrangebyscore(
        redisKey,
        timestamp,
        timestamp,
      );
      return results.length > 0 ? JSON.parse(results[0]) : null;
    } catch (error) {
      this.logger.error(
        `Error getting price point at time for ${cacheKey}:`,
        error,
      );
      return null;
    }
  }
}
