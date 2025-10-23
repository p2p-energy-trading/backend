import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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
export class PriceCacheService {
  private readonly logger = new Logger(PriceCacheService.name);

  // Price cache for different intervals
  private priceCache: Map<string, PricePoint[]> = new Map();
  private candleCache: Map<string, CandleData[]> = new Map();

  private readonly MAX_CACHE_SIZE = {
    '1s': 3600, // 1 hour at 1s intervals
    '1m': 1440, // 24 hours at 1m intervals
    '5m': 2016, // 1 week at 5m intervals
    '1h': 720, // 30 days at 1h intervals
  };

  constructor(
    private marketTradesService: MarketTradesService,
    private blockchainService: BlockchainService,
  ) {
    this.initializeCache();
    // Initialize historical data in background
    void this.initializeHistoricalData();
  }

  private initializeCache() {
    // Initialize cache maps for price history
    this.priceCache.set('price_1s', []);
    this.priceCache.set('price_1m', []);
    this.priceCache.set('price_5m', []);
    this.priceCache.set('price_1h', []);

    // Initialize cache maps for candle data
    this.candleCache.set('candles_1m', []);
    this.candleCache.set('candles_5m', []);
    this.candleCache.set('candles_1h', []);
  }

  @Cron(CronExpression.EVERY_SECOND)
  async updatePriceCache() {
    try {
      // Get current price from blockchain
      const currentPrice = await this.blockchainService.getMarketPrice();
      if (!currentPrice || currentPrice === 0) {
        return; // Skip if no valid price
      }

      // this.logger.debug(`Current price: ${currentPrice}`);

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

      // this.logger.debug(`Adding price point: ${JSON.stringify(pricePoint)}`);

      // Add to 1-second cache
      this.addToPriceCache('price_1s', pricePoint);

      // Generate minute candles from seconds if needed
      void this.generateMinuteCandles();
    } catch (error) {
      this.logger.error('Error updating price cache:', error);
    }
  }

  @Cron('0 * * * * *') // Every minute
  generateMinuteCandles() {
    try {
      const secondsCache = this.priceCache.get('price_1s') || [];
      if (secondsCache.length === 0) return;

      const now = new Date();
      const currentMinute = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
      );
      const lastMinute = new Date(currentMinute.getTime() - 60000);

      // Get points from last complete minute
      const lastMinutePoints = secondsCache.filter((point) => {
        const pointTime = new Date(point.timestamp);
        return pointTime >= lastMinute && pointTime < currentMinute;
      });

      if (lastMinutePoints.length > 0) {
        const candle: CandleData = {
          time: lastMinute.toISOString(),
          open: lastMinutePoints[0].price,
          high: Math.max(...lastMinutePoints.map((p) => p.price)),
          low: Math.min(...lastMinutePoints.map((p) => p.price)),
          close: lastMinutePoints[lastMinutePoints.length - 1].price,
          volume: lastMinutePoints.reduce((sum, p) => sum + p.volume, 0),
        };

        this.addToCandleCache('candles_1m', candle);
      }

      // Generate 5-minute candles from 1-minute candles
      void this.generate5MinuteCandles();
    } catch (error) {
      this.logger.error('Error generating minute candles:', error);
    }
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  generate5MinuteCandles() {
    try {
      const minuteCandles = this.candleCache.get('candles_1m') || [];
      if (minuteCandles.length < 5) return;

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
      const last5MinCandles = minuteCandles.filter((candle) => {
        const candleTime = new Date(candle.time);
        return candleTime >= last5Min && candleTime < current5Min;
      });

      if (last5MinCandles.length > 0) {
        const candle5Min: CandleData = {
          time: last5Min.toISOString(),
          open: last5MinCandles[0].open,
          high: Math.max(...last5MinCandles.map((c) => c.high)),
          low: Math.min(...last5MinCandles.map((c) => c.low)),
          close: last5MinCandles[last5MinCandles.length - 1].close,
          volume: last5MinCandles.reduce((sum, c) => sum + c.volume, 0),
        };

        this.addToCandleCache('candles_5m', candle5Min);
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

  private generate1MinutePricePoints() {
    try {
      const secondsCache = this.priceCache.get('price_1s') || [];
      if (secondsCache.length === 0) return;

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
      const minuteCache = this.priceCache.get('price_1m') || [];
      const existingMinuteData = minuteCache.find(
        (point) => point.timestamp === lastMinute.toISOString(),
      );

      if (existingMinuteData) {
        return; // Skip if we already have data for this minute
      }

      // Get points from last complete minute
      const lastMinutePoints = secondsCache.filter((point) => {
        const pointTime = new Date(point.timestamp);
        return pointTime >= lastMinute && pointTime < currentMinute;
      });

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

        this.addToPriceCache('price_1m', pricePoint);
        this.logger.debug(
          `Generated 1-minute price point for ${lastMinute.toISOString()}: price=${avgPrice}, volume=${totalVolume}`,
        );
      }
    } catch (error) {
      this.logger.error('Error generating 1-minute price points:', error);
    }
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  private generate5MinutePricePoints() {
    try {
      const minuteCache = this.priceCache.get('price_1m') || [];
      if (minuteCache.length < 5) return;

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
      const fiveMinCache = this.priceCache.get('price_5m') || [];
      const existing5MinData = fiveMinCache.find(
        (point) => point.timestamp === last5Min.toISOString(),
      );

      if (existing5MinData) {
        return; // Skip if we already have data for this 5-minute period
      }

      // Get points from last complete 5-minute period
      const last5MinPoints = minuteCache.filter((point) => {
        const pointTime = new Date(point.timestamp);
        return pointTime >= last5Min && pointTime < current5Min;
      });

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

        this.addToPriceCache('price_5m', pricePoint);
        this.logger.debug(
          `Generated 5-minute price point for ${last5Min.toISOString()}: price=${avgPrice}, volume=${totalVolume}`,
        );
      }
    } catch (error) {
      this.logger.error('Error generating 5-minute price points:', error);
    }
  }

  @Cron('0 0 * * * *') // Every hour
  private generate1HourPricePoints() {
    try {
      const fiveMinCache = this.priceCache.get('price_5m') || [];
      if (fiveMinCache.length < 12) return; // Need at least 12 five-minute points for 1 hour

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
      const hourCache = this.priceCache.get('price_1h') || [];
      const existingHourData = hourCache.find(
        (point) => point.timestamp === lastHour.toISOString(),
      );

      if (existingHourData) {
        return; // Skip if we already have data for this hour
      }

      // Get points from last complete hour
      const lastHourPoints = fiveMinCache.filter((point) => {
        const pointTime = new Date(point.timestamp);
        return pointTime >= lastHour && pointTime < currentHour;
      });

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

        this.addToPriceCache('price_1h', pricePoint);
        this.logger.debug(
          `Generated 1-hour price point for ${lastHour.toISOString()}: price=${avgPrice}, volume=${totalVolume}`,
        );
      }
    } catch (error) {
      this.logger.error('Error generating 1-hour price points:', error);
    }
  }

  private addToPriceCache(cacheKey: string, pricePoint: PricePoint) {
    if (!this.priceCache.has(cacheKey)) {
      this.priceCache.set(cacheKey, []);
    }

    const cache = this.priceCache.get(cacheKey)!;

    // Check if price point with same timestamp already exists
    const existingIndex = cache.findIndex(
      (p) => p.timestamp === pricePoint.timestamp,
    );
    if (existingIndex >= 0) {
      // Update existing price point instead of adding duplicate
      cache[existingIndex] = pricePoint;
    } else {
      // Add new price point
      cache.push(pricePoint);
    }

    // Keep only max size and sort by timestamp
    cache.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const maxSize =
      this.MAX_CACHE_SIZE[
        cacheKey.split('_')[1] as keyof typeof this.MAX_CACHE_SIZE
      ] || 1000;
    if (cache.length > maxSize) {
      cache.splice(0, cache.length - maxSize);
    }

    // this.logger.debug(
    //   `Adding price point to cache ${cacheKey}: ${JSON.stringify(pricePoint)}`,
    // );

    this.priceCache.set(cacheKey, cache);
  }

  private addToCandleCache(cacheKey: string, candle: CandleData) {
    if (!this.candleCache.has(cacheKey)) {
      this.candleCache.set(cacheKey, []);
    }

    const cache = this.candleCache.get(cacheKey)!;

    // Check if candle for this time already exists
    const existingIndex = cache.findIndex((c) => c.time === candle.time);
    if (existingIndex >= 0) {
      cache[existingIndex] = candle; // Update existing
    } else {
      cache.push(candle); // Add new
    }

    // Sort by time and keep only max size
    cache.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
    );
    const maxSize =
      this.MAX_CACHE_SIZE[
        cacheKey.split('_')[1] as keyof typeof this.MAX_CACHE_SIZE
      ] || 1000;
    if (cache.length > maxSize) {
      cache.splice(0, cache.length - maxSize);
    }

    this.candleCache.set(cacheKey, cache);
  }

  getPriceHistory(interval: string, limit: number): PricePoint[] {
    const cacheKey = `price_${interval}`;
    const cache = this.priceCache.get(cacheKey) || [];
    return cache.slice(-limit);
  }

  getPriceCandles(interval: string, limit: number): CandleData[] {
    const cacheKey = `candles_${interval}`;
    const cache = this.candleCache.get(cacheKey) || [];
    return cache.slice(-limit);
  }

  getCurrentPrice(): number {
    const cache = this.priceCache.get('price_1s') || [];
    return cache.length > 0 ? cache[cache.length - 1].price : 0;
  }

  getLatestCandle(interval: string): CandleData | null {
    const cache = this.candleCache.get(`candles_${interval}`) || [];
    return cache.length > 0 ? cache[cache.length - 1] : null;
  }

  @Cron(CronExpression.EVERY_HOUR)
  cleanupCache() {
    try {
      // Clean up duplicates first
      this.cleanupDuplicates();

      // Clean up old data to prevent memory leaks
      this.priceCache.forEach((cache, key) => {
        const interval = key.split('_')[1];
        const maxAge =
          this.MAX_CACHE_SIZE[interval as keyof typeof this.MAX_CACHE_SIZE] ||
          1000;
        if (cache.length > maxAge) {
          cache.splice(0, cache.length - maxAge);
        }
      });

      this.candleCache.forEach((cache, key) => {
        const interval = key.split('_')[1];
        const maxAge =
          this.MAX_CACHE_SIZE[interval as keyof typeof this.MAX_CACHE_SIZE] ||
          1000;
        if (cache.length > maxAge) {
          cache.splice(0, cache.length - maxAge);
        }
      });

      this.logger.debug('Cache cleanup completed');
    } catch (error) {
      this.logger.error('Error during cache cleanup:', error);
    }
  }

  // Method to clean duplicate entries from price cache
  cleanupDuplicates() {
    try {
      this.priceCache.forEach((cache, cacheKey) => {
        const uniquePoints = new Map<string, PricePoint>();

        // Keep only the latest entry for each timestamp
        cache.forEach((point) => {
          uniquePoints.set(point.timestamp, point);
        });

        // Convert back to array and sort by timestamp
        const cleanedCache = Array.from(uniquePoints.values()).sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

        this.priceCache.set(cacheKey, cleanedCache);

        if (cache.length !== cleanedCache.length) {
          this.logger.debug(
            `Cleaned ${cache.length - cleanedCache.length} duplicate entries from ${cacheKey}`,
          );
        }
      });
    } catch (error) {
      this.logger.error('Error cleaning up duplicates:', error);
    }
  }

  async initializeHistoricalData() {
    try {
      this.logger.log('Initializing historical price data...');

      // Clean up any existing duplicates first
      this.cleanupDuplicates();

      // Initialize 1-minute data from database if cache is empty
      await this.backfill1MinuteData();

      // Initialize 5-minute data from 1-minute cache
      this.backfill5MinuteData();

      // Initialize 1-hour data from 5-minute cache
      this.backfill1HourData();

      this.logger.log('Historical price data initialization completed');
    } catch (error) {
      this.logger.error('Error initializing historical data:', error);
    }
  }

  private async backfill1MinuteData() {
    try {
      const minuteCache = this.priceCache.get('price_1m') || [];
      if (minuteCache.length > 0) return; // Already has data

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
      historicalCandles.forEach((candle: MarketCandle) => {
        const pricePoint: PricePoint = {
          timestamp: candle.time,
          price: candle.close, // Use close price as the minute price
          volume: candle.volume,
        };
        this.addToPriceCache('price_1m', pricePoint);
      });

      this.logger.debug(
        `Backfilled ${historicalCandles.length} 1-minute price points`,
      );
    } catch (error) {
      this.logger.error('Error backfilling 1-minute data:', error);
    }
  }

  private backfill5MinuteData() {
    try {
      const fiveMinCache = this.priceCache.get('price_5m') || [];
      if (fiveMinCache.length > 0) return; // Already has data

      const minuteCache = this.priceCache.get('price_1m') || [];
      if (minuteCache.length === 0) return; // No source data

      // Group minute data into 5-minute intervals
      const fiveMinGroups = new Map<string, PricePoint[]>();

      minuteCache.forEach((point) => {
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
      fiveMinGroups.forEach((points, timestamp) => {
        if (points.length > 0) {
          const avgPrice =
            points.reduce((sum, p) => sum + p.price, 0) / points.length;
          const totalVolume = points.reduce((sum, p) => sum + p.volume, 0);

          const pricePoint: PricePoint = {
            timestamp,
            price: avgPrice,
            volume: totalVolume,
          };

          this.addToPriceCache('price_5m', pricePoint);
        }
      });

      this.logger.debug(
        `Backfilled ${fiveMinGroups.size} 5-minute price points`,
      );
    } catch (error) {
      this.logger.error('Error backfilling 5-minute data:', error);
    }
  }

  private backfill1HourData() {
    try {
      const hourCache = this.priceCache.get('price_1h') || [];
      if (hourCache.length > 0) return; // Already has data

      const fiveMinCache = this.priceCache.get('price_5m') || [];
      if (fiveMinCache.length === 0) return; // No source data

      // Group 5-minute data into hourly intervals
      const hourGroups = new Map<string, PricePoint[]>();

      fiveMinCache.forEach((point) => {
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
      hourGroups.forEach((points, timestamp) => {
        if (points.length > 0) {
          const avgPrice =
            points.reduce((sum, p) => sum + p.price, 0) / points.length;
          const totalVolume = points.reduce((sum, p) => sum + p.volume, 0);

          const pricePoint: PricePoint = {
            timestamp,
            price: avgPrice,
            volume: totalVolume,
          };

          this.addToPriceCache('price_1h', pricePoint);
        }
      });

      this.logger.debug(`Backfilled ${hourGroups.size} 1-hour price points`);
    } catch (error) {
      this.logger.error('Error backfilling 1-hour data:', error);
    }
  }
}
