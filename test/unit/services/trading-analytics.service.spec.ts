import { Test, TestingModule } from '@nestjs/testing';
import { TradingAnalyticsService } from '../../../src/services/trading/trading-analytics.service';
import { MarketTradesService } from '../../../src/models/marketTrade/marketTrade.service';
import { WalletsService } from '../../../src/models/wallet/wallet.service';
import { TradeOrdersCacheRedisService } from '../../../src/services/trading/trade-orders-cache-redis.service';

describe('TradingAnalyticsService - Unit Tests', () => {
  let service: TradingAnalyticsService;
  let marketTradesService: jest.Mocked<MarketTradesService>;
  let walletsService: jest.Mocked<WalletsService>;
  let tradeOrdersCacheService: jest.Mocked<TradeOrdersCacheRedisService>;

  const mockWalletAddress1 = '0x1234567890123456789012345678901234567890';
  const mockWalletAddress2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const otherWalletAddress = '0x9999999999999999999999999999999999999999';

  const mockWallets: any[] = [
    {
      walletId: 1,
      walletAddress: mockWalletAddress1,
      userId: 'user-1',
      isPrimary: true,
      etkBalance: 100.5,
      idrsBalance: 5000.75,
    },
    {
      walletId: 2,
      walletAddress: mockWalletAddress2,
      userId: 'user-1',
      isPrimary: false,
      etkBalance: 50.25,
      idrsBalance: 2500.5,
    },
  ];

  const mockTrades: any[] = [
    {
      tradeId: 1,
      buyerAddress: mockWalletAddress1,
      sellerAddress: otherWalletAddress,
      etkAmount: 10,
      pricePerEtk: 150,
      timestamp: new Date('2025-10-27T00:00:00Z'),
    },
    {
      tradeId: 2,
      buyerAddress: otherWalletAddress,
      sellerAddress: mockWalletAddress1,
      etkAmount: 5,
      pricePerEtk: 160,
      timestamp: new Date('2025-10-26T00:00:00Z'),
    },
    {
      tradeId: 3,
      buyerAddress: mockWalletAddress2,
      sellerAddress: otherWalletAddress,
      etkAmount: 8,
      pricePerEtk: 155,
      timestamp: new Date('2025-10-25T00:00:00Z'),
    },
    {
      tradeId: 4,
      buyerAddress: otherWalletAddress,
      sellerAddress: mockWalletAddress2,
      etkAmount: 12,
      pricePerEtk: 165,
      timestamp: new Date('2025-09-01T00:00:00Z'), // More than 30 days ago
    },
  ];

  const mockOrders: any[] = [
    {
      orderId: 'order-1',
      walletAddress: mockWalletAddress1,
      orderType: 'BID',
      status: 'OPEN',
      etkAmount: 20,
      pricePerEtk: 145,
    },
    {
      orderId: 'order-2',
      walletAddress: mockWalletAddress1,
      orderType: 'ASK',
      status: 'OPEN',
      etkAmount: 15,
      pricePerEtk: 170,
    },
    {
      orderId: 'order-3',
      walletAddress: mockWalletAddress2,
      orderType: 'BID',
      status: 'OPEN',
      etkAmount: 10,
      pricePerEtk: 140,
    },
    {
      orderId: 'order-4',
      walletAddress: otherWalletAddress,
      orderType: 'ASK',
      status: 'OPEN',
      etkAmount: 25,
      pricePerEtk: 175,
    },
  ];

  beforeEach(async () => {
    const mockMarketTradesService = {
      findAll: jest.fn(),
    };

    const mockWalletsService = {
      findAll: jest.fn(),
    };

    const mockTradeOrdersCacheService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradingAnalyticsService,
        {
          provide: MarketTradesService,
          useValue: mockMarketTradesService,
        },
        {
          provide: WalletsService,
          useValue: mockWalletsService,
        },
        {
          provide: TradeOrdersCacheRedisService,
          useValue: mockTradeOrdersCacheService,
        },
      ],
    }).compile();

    service = module.get<TradingAnalyticsService>(TradingAnalyticsService);
    marketTradesService = module.get(MarketTradesService);
    walletsService = module.get(WalletsService);
    tradeOrdersCacheService = module.get(TradeOrdersCacheRedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have required dependencies injected', () => {
      expect(marketTradesService).toBeDefined();
      expect(walletsService).toBeDefined();
      expect(tradeOrdersCacheService).toBeDefined();
    });
  });

  describe('getTradingStats', () => {
    it('should return empty stats when no wallet addresses provided', async () => {
      const result = await service.getTradingStats([]);

      expect(result).toEqual({
        totalTrades: 0,
        totalVolume: 0,
        averagePrice: 0,
        last24hVolume: 0,
        totalEarnings: 0,
        totalSpending: 0,
        netProfit: 0,
      });
      expect(marketTradesService.findAll).not.toHaveBeenCalled();
    });

    it('should calculate trading stats for user wallets', async () => {
      marketTradesService.findAll.mockResolvedValueOnce(mockTrades);

      const walletAddresses = [mockWalletAddress1, mockWalletAddress2];
      const result = await service.getTradingStats(walletAddresses);

      // User bought: 10 ETK @ 150 + 8 ETK @ 155 = 1500 + 1240 = 2740 IDRS spent
      // User sold: 5 ETK @ 160 + 12 ETK @ 165 = 800 + 1980 = 2780 IDRS earned
      // Total volume: 10 + 5 + 8 + 12 = 35 ETK
      // Average price: (150 + 160 + 155 + 165) / 4 = 157.5
      // Net profit: 2780 - 2740 = 40

      expect(result.totalTrades).toBe(4);
      expect(result.totalVolume).toBe(35);
      expect(result.averagePrice).toBe(157.5);
      expect(result.totalEarnings).toBe(2780);
      expect(result.totalSpending).toBe(2740);
      expect(result.netProfit).toBe(40);
    });

    it('should calculate 24h volume correctly', async () => {
      // Mock current time to be 2025-10-27 12:00:00
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2025-10-27T12:00:00Z').getTime());

      marketTradesService.findAll.mockResolvedValueOnce(mockTrades);

      const result = await service.getTradingStats([
        mockWalletAddress1,
        mockWalletAddress2,
      ]);

      // Only trades from 2025-10-26 12:00:00 onwards count as 24h
      // Trade 1: 2025-10-27 00:00:00 - within 24h - 10 ETK
      // Trade 2: 2025-10-26 00:00:00 - NOT within 24h (more than 24h ago)
      // Trade 3: 2025-10-25 00:00:00 - NOT within 24h
      expect(result.last24hVolume).toBe(10);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should handle trades with only buying', async () => {
      const buyOnlyTrades: any[] = [
        {
          tradeId: 1,
          buyerAddress: mockWalletAddress1,
          sellerAddress: otherWalletAddress,
          etkAmount: 10,
          pricePerEtk: 150,
          timestamp: new Date('2025-10-27T00:00:00Z'),
        },
      ];

      marketTradesService.findAll.mockResolvedValueOnce(buyOnlyTrades);

      const result = await service.getTradingStats([mockWalletAddress1]);

      expect(result.totalTrades).toBe(1);
      expect(result.totalVolume).toBe(10);
      expect(result.totalEarnings).toBe(0);
      expect(result.totalSpending).toBe(1500);
      expect(result.netProfit).toBe(-1500);
    });

    it('should handle trades with only selling', async () => {
      const sellOnlyTrades: any[] = [
        {
          tradeId: 1,
          buyerAddress: otherWalletAddress,
          sellerAddress: mockWalletAddress1,
          etkAmount: 5,
          pricePerEtk: 160,
          timestamp: new Date('2025-10-27T00:00:00Z'),
        },
      ];

      marketTradesService.findAll.mockResolvedValueOnce(sellOnlyTrades);

      const result = await service.getTradingStats([mockWalletAddress1]);

      expect(result.totalTrades).toBe(1);
      expect(result.totalVolume).toBe(5);
      expect(result.totalEarnings).toBe(800);
      expect(result.totalSpending).toBe(0);
      expect(result.netProfit).toBe(800);
    });

    it('should filter out trades not belonging to user', async () => {
      marketTradesService.findAll.mockResolvedValueOnce(mockTrades);

      const result = await service.getTradingStats([otherWalletAddress]);

      expect(result.totalTrades).toBe(4); // Other wallet is in all trades
    });

    it('should handle service errors gracefully', async () => {
      marketTradesService.findAll.mockRejectedValueOnce(
        new Error('Database error'),
      );

      const result = await service.getTradingStats([mockWalletAddress1]);

      expect(result).toEqual({
        totalTrades: 0,
        totalVolume: 0,
        averagePrice: 0,
        last24hVolume: 0,
        totalEarnings: 0,
        totalSpending: 0,
        netProfit: 0,
      });
    });

    it('should round values correctly', async () => {
      const tradesWithDecimals: any[] = [
        {
          tradeId: 1,
          buyerAddress: mockWalletAddress1,
          sellerAddress: otherWalletAddress,
          etkAmount: 10.123456,
          pricePerEtk: 150.456789,
          timestamp: new Date('2025-10-27T00:00:00Z'),
        },
      ];

      marketTradesService.findAll.mockResolvedValueOnce(tradesWithDecimals);

      const result = await service.getTradingStats([mockWalletAddress1]);

      // Volume rounded to 3 decimals
      expect(result.totalVolume).toBe(10.123);
      // Price rounded to 2 decimals
      expect(result.averagePrice).toBe(150.46);
      // Spending: 10.123456 * 150.456789 = 1523.14... (service rounds per-trade totals then sums)
      expect(result.totalSpending).toBe(1523.14);
    });
  });

  describe('getTradingPerformance', () => {
    it('should return empty performance when no wallets found', async () => {
      walletsService.findAll.mockResolvedValueOnce([]);

      const result = await service.getTradingPerformance('user-1');

      expect(result.period).toBe('30 days');
      expect(result.summary.totalTrades).toBe(0);
      expect(result.financial.netProfit).toBe('0');
      expect(result.balances.etkBalance).toBe('0');
    });

    it('should calculate trading performance with primary wallet balances', async () => {
      walletsService.findAll.mockResolvedValueOnce(mockWallets);
      marketTradesService.findAll.mockResolvedValueOnce(mockTrades);

      const result = await service.getTradingPerformance('user-1', 30);

      expect(result.period).toBe('30 days');
      expect(result.summary.totalTrades).toBe(4);
      expect(result.summary.totalVolume).toBe('35');
      expect(result.financial.totalEarnings).toBe('2780');
      expect(result.financial.totalSpending).toBe('2740');
      expect(result.financial.netProfit).toBe('40');
      // Profit margin: (40 / 2780) * 100 = 1.43... rounded to 1
      expect(result.financial.profitMargin).toBe(1);
      // Primary wallet balances
      expect(result.balances.etkBalance).toBe('100.5');
      expect(result.balances.idrsBalance).toBe('5000.75');
    });

    it('should use first wallet when no primary wallet exists', async () => {
      const walletsNoPrimary: any[] = [
        { ...mockWallets[0], isPrimary: false },
        { ...mockWallets[1], isPrimary: false },
      ];

      walletsService.findAll.mockResolvedValueOnce(walletsNoPrimary);
      marketTradesService.findAll.mockResolvedValueOnce(mockTrades);

      const result = await service.getTradingPerformance('user-1');

      // Should use first wallet's balances
      expect(result.balances.etkBalance).toBe('100.5');
      expect(result.balances.idrsBalance).toBe('5000.75');
    });

    it('should support custom period days', async () => {
      walletsService.findAll.mockResolvedValueOnce(mockWallets);
      marketTradesService.findAll.mockResolvedValueOnce(mockTrades);

      const result = await service.getTradingPerformance('user-1', 7);

      expect(result.period).toBe('7 days');
    });

    it('should calculate zero profit margin when no earnings', async () => {
      const buyOnlyTrades: any[] = [
        {
          tradeId: 1,
          buyerAddress: mockWalletAddress1,
          sellerAddress: otherWalletAddress,
          etkAmount: 10,
          pricePerEtk: 150,
          timestamp: new Date('2025-10-27T00:00:00Z'),
        },
      ];

      walletsService.findAll.mockResolvedValueOnce(mockWallets);
      marketTradesService.findAll.mockResolvedValueOnce(buyOnlyTrades);

      const result = await service.getTradingPerformance('user-1');

      expect(result.financial.profitMargin).toBe(0);
    });

    it('should handle service errors gracefully', async () => {
      walletsService.findAll.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getTradingPerformance('user-1');

      expect(result.period).toBe('30 days');
      expect(result.summary.totalTrades).toBe(0);
    });
  });

  describe('getTradingMetrics', () => {
    it('should return empty metrics when no wallets found', async () => {
      walletsService.findAll.mockResolvedValueOnce([]);

      const result = await service.getTradingMetrics('user-1');

      expect(result).toEqual({
        trades: {
          total: 0,
          buy: 0,
          sell: 0,
          buyVolume: 0,
          sellVolume: 0,
        },
        orders: {
          total: 0,
          bid: 0,
          ask: 0,
        },
      });
    });

    it('should calculate trade and order metrics', async () => {
      walletsService.findAll.mockResolvedValueOnce(mockWallets);
      marketTradesService.findAll.mockResolvedValueOnce(mockTrades);
      tradeOrdersCacheService.findAll.mockResolvedValueOnce(mockOrders);

      const result = await service.getTradingMetrics('user-1');

      // Trades: 2 buy (10 + 8 = 18 ETK), 2 sell (5 + 12 = 17 ETK)
      expect(result.trades.total).toBe(4);
      expect(result.trades.buy).toBe(2);
      expect(result.trades.sell).toBe(2);
      expect(result.trades.buyVolume).toBe(18);
      expect(result.trades.sellVolume).toBe(17);

      // Orders: 3 user orders (2 BID, 1 ASK)
      expect(result.orders.total).toBe(3);
      expect(result.orders.bid).toBe(2);
      expect(result.orders.ask).toBe(1);
    });

    it('should filter only OPEN orders', async () => {
      const ordersWithDifferentStatus: any[] = [
        ...mockOrders,
        {
          orderId: 'order-5',
          walletAddress: mockWalletAddress1,
          orderType: 'BID',
          status: 'FILLED',
          etkAmount: 30,
          pricePerEtk: 150,
        },
        {
          orderId: 'order-6',
          walletAddress: mockWalletAddress1,
          orderType: 'ASK',
          status: 'CANCELLED',
          etkAmount: 20,
          pricePerEtk: 180,
        },
      ];

      walletsService.findAll.mockResolvedValueOnce(mockWallets);
      marketTradesService.findAll.mockResolvedValueOnce(mockTrades);
      tradeOrdersCacheService.findAll.mockResolvedValueOnce(
        ordersWithDifferentStatus,
      );

      const result = await service.getTradingMetrics('user-1');

      // Should only count OPEN orders (3 total)
      expect(result.orders.total).toBe(3);
    });

    it('should round volume values correctly', async () => {
      const tradesWithDecimals: any[] = [
        {
          tradeId: 1,
          buyerAddress: mockWalletAddress1,
          sellerAddress: otherWalletAddress,
          etkAmount: 10.123456,
          pricePerEtk: 150,
          timestamp: new Date('2025-10-27T00:00:00Z'),
        },
      ];

      walletsService.findAll.mockResolvedValueOnce(mockWallets);
      marketTradesService.findAll.mockResolvedValueOnce(tradesWithDecimals);
      tradeOrdersCacheService.findAll.mockResolvedValueOnce([]);

      const result = await service.getTradingMetrics('user-1');

      expect(result.trades.buyVolume).toBe(10.123);
    });

    it('should handle service errors gracefully', async () => {
      walletsService.findAll.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getTradingMetrics('user-1');

      expect(result.trades.total).toBe(0);
      expect(result.orders.total).toBe(0);
    });
  });

  describe('getTradeAnalytics', () => {
    it('should return empty analytics when no wallets found', async () => {
      walletsService.findAll.mockResolvedValueOnce([]);

      const result = await service.getTradeAnalytics('user-1', 'monthly');

      expect(result).toEqual({
        period: 'monthly',
        periodDays: 30,
        trades: 0,
        volume: 0,
        value: 0,
        averagePrice: 0,
        highestPrice: 0,
        lowestPrice: 0,
      });
    });

    it('should calculate daily analytics', async () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2025-10-27T12:00:00Z').getTime());

      walletsService.findAll.mockResolvedValueOnce(mockWallets);
      marketTradesService.findAll.mockResolvedValueOnce(mockTrades);

      const result = await service.getTradeAnalytics('user-1', 'daily');

      expect(result.period).toBe('daily');
      expect(result.periodDays).toBe(1);
      // Only trade from last 24h (Trade 1: 10 ETK @ 150)
      expect(result.trades).toBe(1);
      expect(result.volume).toBe(10);
      expect(result.value).toBe(1500);
      expect(result.averagePrice).toBe(150);
      expect(result.highestPrice).toBe(150);
      expect(result.lowestPrice).toBe(150);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should calculate weekly analytics', async () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2025-10-27T12:00:00Z').getTime());

      walletsService.findAll.mockResolvedValueOnce(mockWallets);
      marketTradesService.findAll.mockResolvedValueOnce(mockTrades);

      const result = await service.getTradeAnalytics('user-1', 'weekly');

      expect(result.period).toBe('weekly');
      expect(result.periodDays).toBe(7);
      // Trades within last 7 days (Trades 1, 2, 3)
      expect(result.trades).toBe(3);
      expect(result.volume).toBe(23); // 10 + 5 + 8
      expect(result.averagePrice).toBe(155); // (150 + 160 + 155) / 3
      expect(result.highestPrice).toBe(160);
      expect(result.lowestPrice).toBe(150);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should calculate monthly analytics', async () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2025-10-27T12:00:00Z').getTime());

      walletsService.findAll.mockResolvedValueOnce(mockWallets);
      marketTradesService.findAll.mockResolvedValueOnce(mockTrades);

      const result = await service.getTradeAnalytics('user-1', 'monthly');

      expect(result.period).toBe('monthly');
      expect(result.periodDays).toBe(30);
      // All trades within last 30 days (Trades 1, 2, 3 but NOT 4 from Sep 1)
      expect(result.trades).toBe(3);
      expect(result.volume).toBe(23); // 10 + 5 + 8
      expect(result.value).toBe(3540); // (10*150) + (5*160) + (8*155)
      expect(result.averagePrice).toBe(155);
      expect(result.highestPrice).toBe(160);
      expect(result.lowestPrice).toBe(150);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should handle no trades in period', async () => {
      // Set mock time way in the future so all trades are outside daily period
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2026-01-01T12:00:00Z').getTime());

      walletsService.findAll.mockResolvedValueOnce(mockWallets);
      marketTradesService.findAll.mockResolvedValueOnce(mockTrades);

      const result = await service.getTradeAnalytics('user-1', 'daily');

      expect(result.trades).toBe(0);
      expect(result.volume).toBe(0);
      expect(result.highestPrice).toBe(0);
      expect(result.lowestPrice).toBe(0);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should round values correctly', async () => {
      const tradesWithDecimals: any[] = [
        {
          tradeId: 1,
          buyerAddress: mockWalletAddress1,
          sellerAddress: otherWalletAddress,
          etkAmount: 10.123456,
          pricePerEtk: 150.789012,
          timestamp: new Date('2025-10-27T00:00:00Z'),
        },
      ];

      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2025-10-27T12:00:00Z').getTime());

      walletsService.findAll.mockResolvedValueOnce(mockWallets);
      marketTradesService.findAll.mockResolvedValueOnce(tradesWithDecimals);

      const result = await service.getTradeAnalytics('user-1', 'daily');

      expect(result.volume).toBe(10.123); // 3 decimals
      expect(result.averagePrice).toBe(150.79); // 2 decimals
      expect(result.highestPrice).toBe(150.79); // 2 decimals
      expect(result.lowestPrice).toBe(150.79); // 2 decimals

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should handle service errors gracefully', async () => {
      walletsService.findAll.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getTradeAnalytics('user-1', 'monthly');

      expect(result.period).toBe('monthly');
      expect(result.trades).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty trade list', async () => {
      marketTradesService.findAll.mockResolvedValueOnce([]);

      const result = await service.getTradingStats([mockWalletAddress1]);

      expect(result.totalTrades).toBe(0);
      expect(result.averagePrice).toBe(0);
    });

    it('should handle trades with zero amounts', async () => {
      const zeroAmountTrades: any[] = [
        {
          tradeId: 1,
          buyerAddress: mockWalletAddress1,
          sellerAddress: otherWalletAddress,
          etkAmount: 0,
          pricePerEtk: 150,
          timestamp: new Date('2025-10-27T00:00:00Z'),
        },
      ];

      marketTradesService.findAll.mockResolvedValueOnce(zeroAmountTrades);

      const result = await service.getTradingStats([mockWalletAddress1]);

      expect(result.totalVolume).toBe(0);
      expect(result.totalSpending).toBe(0);
    });

    it('should handle missing optional trade fields', async () => {
      const incompleteTradesAny: any[] = [
        {
          tradeId: 1,
          buyerAddress: mockWalletAddress1,
          sellerAddress: otherWalletAddress,
          // Missing etkAmount and pricePerEtk
        },
      ];

      marketTradesService.findAll.mockResolvedValueOnce(incompleteTradesAny);

      const result = await service.getTradingStats([mockWalletAddress1]);

      expect(result.totalTrades).toBe(1);
      expect(result.totalVolume).toBe(0);
      expect(result.averagePrice).toBe(0);
    });

    it('should handle wallet with zero balances', async () => {
      const zeroBalanceWallets: any[] = [
        {
          ...mockWallets[0],
          etkBalance: 0,
          idrsBalance: 0,
        },
      ];

      walletsService.findAll.mockResolvedValueOnce(zeroBalanceWallets);
      marketTradesService.findAll.mockResolvedValueOnce([]);

      const result = await service.getTradingPerformance('user-1');

      expect(result.balances.etkBalance).toBe('0');
      expect(result.balances.idrsBalance).toBe('0');
    });
  });
});
