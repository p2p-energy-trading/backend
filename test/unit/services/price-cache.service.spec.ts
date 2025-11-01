import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PriceCacheService } from '../../../src/services/trading/price-cache.service';
import { MarketTradesService } from '../../../src/models/marketTrade/marketTrade.service';
import { BlockchainService } from '../../../src/services/blockchain/blockchain.service';
import { createMockRedisClient } from '../../helpers/mock-external-services.helper';

describe('PriceCacheService - Unit Tests', () => {
  let service: PriceCacheService;
  let configService: jest.Mocked<ConfigService>;
  let marketTradesService: jest.Mocked<MarketTradesService>;
  let blockchainService: jest.Mocked<BlockchainService>;
  let mockRedisClient: any;

  const mockPricePoint = {
    timestamp: '2025-01-01T00:00:00.000Z',
    price: 1500,
    volume: 100,
  };

  const mockCandleData = {
    time: '2025-01-01T00:00:00.000Z',
    open: 1480,
    high: 1520,
    low: 1470,
    close: 1500,
    volume: 500,
  };

  beforeEach(async () => {
    mockRedisClient = createMockRedisClient();

    // Mock Redis responses
    mockRedisClient.get.mockResolvedValue('1500');
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.zadd.mockResolvedValue(1);
    mockRedisClient.zcard.mockResolvedValue(100);
    mockRedisClient.expire.mockResolvedValue(1);
    mockRedisClient.zremrangebyrank.mockResolvedValue(10);
    mockRedisClient.zrevrange.mockResolvedValue([
      JSON.stringify(mockPricePoint),
    ]);
    mockRedisClient.zrangebyscore.mockResolvedValue([
      JSON.stringify(mockPricePoint),
    ]);

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          REDIS_HOST: 'localhost',
          REDIS_PORT: 6379,
          REDIS_PASSWORD: undefined,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const mockMarketTradesService = {
      findRecentTrades: jest.fn(),
      getPriceHistory: jest.fn(),
    };

    const mockBlockchainService = {
      getMarketPrice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceCacheService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MarketTradesService,
          useValue: mockMarketTradesService,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
      ],
    }).compile();

    service = module.get<PriceCacheService>(PriceCacheService);
    configService = module.get(ConfigService);
    marketTradesService = module.get(MarketTradesService);
    blockchainService = module.get(BlockchainService);

    // Inject mock Redis client (bypass onModuleInit)
    (service as any).redisClient = mockRedisClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have required dependencies injected', () => {
      expect(configService).toBeDefined();
      expect(marketTradesService).toBeDefined();
      expect(blockchainService).toBeDefined();
    });
  });

  describe('getCurrentPrice', () => {
    it('should return current price from Redis', async () => {
      mockRedisClient.get.mockResolvedValueOnce('1550.50');

      const result = await service.getCurrentPrice();

      expect(result).toBe(1550.5);
      expect(mockRedisClient.get).toHaveBeenCalledWith('price:current');
    });

    it('should return 0 when no price in cache', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);

      const result = await service.getCurrentPrice();

      expect(result).toBe(0);
    });

    it('should return 0 on Redis error', async () => {
      mockRedisClient.get.mockRejectedValueOnce(new Error('Redis error'));

      const result = await service.getCurrentPrice();

      expect(result).toBe(0);
    });

    it('should handle string to number conversion', async () => {
      mockRedisClient.get.mockResolvedValueOnce('2000.99');

      const result = await service.getCurrentPrice();

      expect(result).toBe(2000.99);
      expect(typeof result).toBe('number');
    });
  });

  describe('getPriceHistory', () => {
    it('should return price history for given interval', async () => {
      const mockPoints = [
        { timestamp: '2025-01-01T00:00:00.000Z', price: 1500, volume: 100 },
        { timestamp: '2025-01-01T00:01:00.000Z', price: 1510, volume: 150 },
      ];

      mockRedisClient.zrevrange.mockResolvedValueOnce(
        mockPoints.map((p) => JSON.stringify(p)).reverse(),
      );

      const result = await service.getPriceHistory('1m', 100);

      expect(result).toHaveLength(2);
      expect(result[0].price).toBe(1500);
      expect(result[1].price).toBe(1510);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'price:history:price_1m',
        0,
        99,
      );
    });

    it('should return empty array on error', async () => {
      mockRedisClient.zrevrange.mockRejectedValueOnce(new Error('Redis error'));

      const result = await service.getPriceHistory('1m', 100);

      expect(result).toEqual([]);
    });

    it('should handle different intervals', async () => {
      mockRedisClient.zrevrange.mockResolvedValue([
        JSON.stringify(mockPricePoint),
      ]);

      await service.getPriceHistory('1s', 50);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'price:history:price_1s',
        0,
        49,
      );

      await service.getPriceHistory('5m', 50);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'price:history:price_5m',
        0,
        49,
      );

      await service.getPriceHistory('1h', 50);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'price:history:price_1h',
        0,
        49,
      );
    });

    it('should reverse results to maintain chronological order', async () => {
      const mockPoints = [
        { timestamp: '2025-01-01T00:02:00.000Z', price: 1520, volume: 200 },
        { timestamp: '2025-01-01T00:01:00.000Z', price: 1510, volume: 150 },
        { timestamp: '2025-01-01T00:00:00.000Z', price: 1500, volume: 100 },
      ];

      mockRedisClient.zrevrange.mockResolvedValueOnce(
        mockPoints.map((p) => JSON.stringify(p)),
      );

      const result = await service.getPriceHistory('1m', 3);

      // zrevrange returns newest first, service reverses to oldest first
      expect(result[0].timestamp).toBe('2025-01-01T00:00:00.000Z'); // oldest
      expect(result[2].timestamp).toBe('2025-01-01T00:02:00.000Z'); // newest
    });
  });

  describe('getPriceCandles', () => {
    it('should return candle data for given interval', async () => {
      const mockCandles = [
        {
          time: '2025-01-01T00:00:00.000Z',
          open: 1480,
          high: 1520,
          low: 1470,
          close: 1500,
          volume: 500,
        },
        {
          time: '2025-01-01T00:05:00.000Z',
          open: 1500,
          high: 1530,
          low: 1490,
          close: 1510,
          volume: 600,
        },
      ];

      mockRedisClient.zrevrange.mockResolvedValueOnce(
        mockCandles.map((c) => JSON.stringify(c)).reverse(),
      );

      const result = await service.getPriceCandles('5m', 100);

      expect(result).toHaveLength(2);
      expect(result[0].open).toBe(1480);
      expect(result[0].close).toBe(1500);
      expect(result[1].close).toBe(1510);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'price:candles:candles_5m',
        0,
        99,
      );
    });

    it('should return empty array on error', async () => {
      mockRedisClient.zrevrange.mockRejectedValueOnce(new Error('Redis error'));

      const result = await service.getPriceCandles('5m', 100);

      expect(result).toEqual([]);
    });

    it('should handle different candle intervals', async () => {
      mockRedisClient.zrevrange.mockResolvedValue([
        JSON.stringify(mockCandleData),
      ]);

      await service.getPriceCandles('1m', 50);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'price:candles:candles_1m',
        0,
        49,
      );

      await service.getPriceCandles('5m', 50);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'price:candles:candles_5m',
        0,
        49,
      );
    });
  });

  describe('getLatestCandle', () => {
    it('should return the most recent candle', async () => {
      mockRedisClient.zrevrange.mockResolvedValueOnce([
        JSON.stringify(mockCandleData),
      ]);

      const result = await service.getLatestCandle('5m');

      expect(result).toEqual(mockCandleData);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'price:candles:candles_5m',
        0,
        0,
      );
    });

    it('should return null when no candles available', async () => {
      mockRedisClient.zrevrange.mockResolvedValueOnce([]);

      const result = await service.getLatestCandle('1m');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockRedisClient.zrevrange.mockRejectedValueOnce(new Error('Redis error'));

      const result = await service.getLatestCandle('5m');

      expect(result).toBeNull();
    });
  });

  describe('Data Transformation Logic', () => {
    it('should correctly parse JSON from Redis', async () => {
      const complexPricePoint = {
        timestamp: '2025-01-01T12:30:00.000Z',
        price: 1599.99,
        volume: 1234.56,
      };

      mockRedisClient.zrevrange.mockResolvedValueOnce([
        JSON.stringify(complexPricePoint),
      ]);

      const result = await service.getPriceHistory('1m', 1);

      expect(result[0]).toEqual(complexPricePoint);
      expect(result[0].price).toBe(1599.99);
      expect(result[0].volume).toBe(1234.56);
    });

    it('should handle multiple candles with various OHLC values', async () => {
      const candles = [
        {
          time: '2025-01-01T00:00:00.000Z',
          open: 1000,
          high: 1100,
          low: 950,
          close: 1050,
          volume: 1000,
        },
        {
          time: '2025-01-01T00:05:00.000Z',
          open: 1050,
          high: 1200,
          low: 1000,
          close: 1150,
          volume: 1500,
        },
      ];

      mockRedisClient.zrevrange.mockResolvedValueOnce(
        candles.map((c) => JSON.stringify(c)).reverse(),
      );

      const result = await service.getPriceCandles('5m', 2);

      expect(result).toHaveLength(2);
      expect(result[0].high).toBe(1100);
      expect(result[0].low).toBe(950);
      expect(result[1].high).toBe(1200);
      expect(result[1].low).toBe(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Connection refused'));

      const price = await service.getCurrentPrice();
      expect(price).toBe(0);

      mockRedisClient.zrevrange.mockRejectedValue(
        new Error('Connection refused'),
      );

      const history = await service.getPriceHistory('1m', 100);
      expect(history).toEqual([]);

      const candles = await service.getPriceCandles('5m', 100);
      expect(candles).toEqual([]);
    });

    it('should handle invalid JSON in cache gracefully', async () => {
      mockRedisClient.zrevrange.mockResolvedValueOnce(['invalid json']);

      // Should throw JSON parse error which gets caught
      const result = await service.getPriceHistory('1m', 1);

      // Depending on error handling, may return empty array
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty cache results', async () => {
      // Clear mock setup for this specific test
      mockRedisClient.zrevrange.mockReset();
      mockRedisClient.zrevrange.mockResolvedValue([]);

      const history = await service.getPriceHistory('1m', 100);
      expect(history).toEqual([]);

      const candles = await service.getPriceCandles('5m', 100);
      expect(candles).toEqual([]);

      const latestCandle = await service.getLatestCandle('1m');
      expect(latestCandle).toBeNull();

      // Restore default behavior for other tests
      mockRedisClient.zrevrange.mockResolvedValue([
        JSON.stringify(mockPricePoint),
      ]);
    });
  });

  describe('Redis Key Patterns', () => {
    it('should use correct Redis keys for price history', async () => {
      await service.getPriceHistory('1s', 10);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'price:history:price_1s',
        expect.any(Number),
        expect.any(Number),
      );

      await service.getPriceHistory('1m', 10);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'price:history:price_1m',
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should use correct Redis keys for candles', async () => {
      await service.getPriceCandles('1m', 10);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'price:candles:candles_1m',
        expect.any(Number),
        expect.any(Number),
      );

      await service.getPriceCandles('5m', 10);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        'price:candles:candles_5m',
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should use correct key for current price', async () => {
      await service.getCurrentPrice();
      expect(mockRedisClient.get).toHaveBeenCalledWith('price:current');
    });
  });
});
