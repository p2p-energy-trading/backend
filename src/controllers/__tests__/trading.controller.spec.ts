import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TradingController } from '../trading.controller';
import { BlockchainService } from '../../services/blockchain.service';
import { WalletsService } from '../../graphql/Wallets/Wallets.service';
import { TradeOrdersCacheService } from '../../graphql/TradeOrdersCache/TradeOrdersCache.service';
import { MarketTradesService } from '../../graphql/MarketTrades/MarketTrades.service';
import { JwtAuthGuard } from '../../auth/guards/auth.guards';
import { OrderType } from '../../common/enums';
import {
  mockJwtUser,
  createMockWallet,
  createMockTradeOrder,
  createMockMarketTrade,
} from '../../test-setup';

describe('TradingController', () => {
  let controller: TradingController;
  let blockchainService: jest.Mocked<BlockchainService>;
  let walletsService: jest.Mocked<WalletsService>;
  let tradeOrdersCacheService: jest.Mocked<TradeOrdersCacheService>;
  let marketTradesService: jest.Mocked<MarketTradesService>;

  beforeEach(async () => {
    const mockBlockchainService = {
      approveToken: jest.fn(),
      placeBuyOrder: jest.fn(),
      placeSellOrder: jest.fn(),
      cancelOrder: jest.fn(),
      getTokenBalance: jest.fn(),
      getAllowance: jest.fn(),
    };

    const mockWalletsService = {
      findByAddress: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
    };

    const mockTradeOrdersCacheService = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findActiveOrders: jest.fn(),
    };

    const mockMarketTradesService = {
      findByUserId: jest.fn(),
      findRecentTrades: jest.fn(),
      getTradingStats: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TradingController],
      providers: [
        { provide: BlockchainService, useValue: mockBlockchainService },
        { provide: WalletsService, useValue: mockWalletsService },
        {
          provide: TradeOrdersCacheService,
          useValue: mockTradeOrdersCacheService,
        },
        { provide: MarketTradesService, useValue: mockMarketTradesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TradingController>(TradingController);
    blockchainService = module.get(BlockchainService);
    walletsService = module.get(WalletsService);
    tradeOrdersCacheService = module.get(TradeOrdersCacheService);
    marketTradesService = module.get(MarketTradesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('POST /trading/approve', () => {
    const mockWallet = createMockWallet({
      address: '0x123abc456def',
      userId: 1,
    });

    const approveRequest = {
      walletAddress: '0x123abc456def',
      tokenContract: '0x456def789abc',
      spenderContract: '0x789abc123def',
      amount: 1000,
    };

    beforeEach(() => {
      walletsService.findByAddress.mockResolvedValue(mockWallet);
    });

    it('should approve token spending successfully', async () => {
      const mockRequest = { user: mockJwtUser };

      blockchainService.approveToken.mockResolvedValue({
        success: true,
        transactionHash: '0xabc123def456',
      });

      const result = await controller.approveToken(approveRequest, mockRequest);

      expect(result).toEqual({
        success: true,
        transactionHash: '0xabc123def456',
        message: 'Token approval successful',
      });

      expect(walletsService.findByAddress).toHaveBeenCalledWith(
        approveRequest.walletAddress,
      );
      expect(blockchainService.approveToken).toHaveBeenCalledWith(
        approveRequest.walletAddress,
        approveRequest.tokenContract,
        approveRequest.spenderContract,
        approveRequest.amount,
      );
    });

    it('should reject unauthorized wallet access', async () => {
      const mockRequest = { user: { ...mockJwtUser, userId: 999 } };

      await expect(
        controller.approveToken(approveRequest, mockRequest),
      ).rejects.toThrow(BadRequestException);

      expect(blockchainService.approveToken).not.toHaveBeenCalled();
    });

    it('should handle wallet not found', async () => {
      const mockRequest = { user: mockJwtUser };
      walletsService.findByAddress.mockResolvedValue(null);

      await expect(
        controller.approveToken(approveRequest, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle blockchain service errors', async () => {
      const mockRequest = { user: mockJwtUser };

      blockchainService.approveToken.mockRejectedValue(
        new Error('Blockchain transaction failed'),
      );

      await expect(
        controller.approveToken(approveRequest, mockRequest),
      ).rejects.toThrow('Blockchain transaction failed');
    });
  });

  describe('POST /trading/order/buy', () => {
    const mockWallet = createMockWallet({
      address: '0x123abc456def',
      userId: 1,
    });

    const buyOrderRequest = {
      walletAddress: '0x123abc456def',
      orderType: 'BID' as const,
      quantity: 1000,
      price: 0.15,
    };

    beforeEach(() => {
      walletsService.findByAddress.mockResolvedValue(mockWallet);
    });

    it('should place buy order successfully', async () => {
      const mockRequest = { user: mockJwtUser };

      blockchainService.placeBuyOrder.mockResolvedValue({
        success: true,
        orderId: 123,
        transactionHash: '0xdef456abc789',
      });

      const result = await controller.placeBuyOrder(
        buyOrderRequest,
        mockRequest,
      );

      expect(result).toEqual({
        success: true,
        orderId: 123,
        transactionHash: '0xdef456abc789',
        message: 'Buy order placed successfully',
      });

      expect(blockchainService.placeBuyOrder).toHaveBeenCalledWith({
        userId: mockJwtUser.userId,
        quantity: buyOrderRequest.quantity,
        price: buyOrderRequest.price,
      });
    });

    it('should validate order parameters', async () => {
      const mockRequest = { user: mockJwtUser };
      const invalidOrderRequest = {
        ...buyOrderRequest,
        quantity: -100, // Invalid quantity
      };

      await expect(
        controller.placeBuyOrder(invalidOrderRequest, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should check sufficient balance before placing order', async () => {
      const mockRequest = { user: mockJwtUser };

      blockchainService.getTokenBalance.mockResolvedValue('50'); // Insufficient balance

      const result = await controller.checkBalance(
        mockWallet.address,
        'IDRS',
        mockRequest,
      );

      expect(result.balance).toBe('50');
    });
  });

  describe('POST /trading/order/sell', () => {
    const mockWallet = createMockWallet({
      address: '0x123abc456def',
      userId: 1,
    });

    const sellOrderRequest = {
      walletAddress: '0x123abc456def',
      orderType: 'ASK' as const,
      quantity: 500,
      price: 0.16,
    };

    beforeEach(() => {
      walletsService.findByAddress.mockResolvedValue(mockWallet);
    });

    it('should place sell order successfully', async () => {
      const mockRequest = { user: mockJwtUser };

      blockchainService.placeSellOrder.mockResolvedValue({
        success: true,
        orderId: 124,
        transactionHash: '0x789abc123def',
      });

      const result = await controller.placeSellOrder(
        sellOrderRequest,
        mockRequest,
      );

      expect(result).toEqual({
        success: true,
        orderId: 124,
        transactionHash: '0x789abc123def',
        message: 'Sell order placed successfully',
      });

      expect(blockchainService.placeSellOrder).toHaveBeenCalledWith({
        userId: mockJwtUser.userId,
        quantity: sellOrderRequest.quantity,
        price: sellOrderRequest.price,
      });
    });

    it('should validate sell order parameters', async () => {
      const mockRequest = { user: mockJwtUser };
      const invalidOrderRequest = {
        ...sellOrderRequest,
        price: 0, // Invalid price
      };

      await expect(
        controller.placeSellOrder(invalidOrderRequest, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('DELETE /trading/order/:orderId', () => {
    const mockOrder = createMockTradeOrder({
      id: 1,
      userId: 1,
      status: 'ACTIVE',
    });

    beforeEach(() => {
      tradeOrdersCacheService.findById.mockResolvedValue(mockOrder);
    });

    it('should cancel order successfully', async () => {
      const mockRequest = { user: mockJwtUser };
      const orderId = '1';

      blockchainService.cancelOrder.mockResolvedValue({
        success: true,
        transactionHash: '0x123def456abc',
      });

      const result = await controller.cancelOrder(orderId, mockRequest);

      expect(result).toEqual({
        success: true,
        transactionHash: '0x123def456abc',
        message: 'Order cancelled successfully',
      });

      expect(tradeOrdersCacheService.findById).toHaveBeenCalledWith(1);
      expect(blockchainService.cancelOrder).toHaveBeenCalledWith(
        1,
        mockJwtUser.userId,
      );
    });

    it('should reject unauthorized order cancellation', async () => {
      const mockRequest = { user: { ...mockJwtUser, userId: 999 } };
      const orderId = '1';

      await expect(
        controller.cancelOrder(orderId, mockRequest),
      ).rejects.toThrow(BadRequestException);

      expect(blockchainService.cancelOrder).not.toHaveBeenCalled();
    });

    it('should handle order not found', async () => {
      const mockRequest = { user: mockJwtUser };
      const orderId = '999';

      tradeOrdersCacheService.findById.mockResolvedValue(null);

      await expect(
        controller.cancelOrder(orderId, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /trading/orders', () => {
    it('should return user orders', async () => {
      const mockRequest = { user: mockJwtUser };
      const mockOrders = [
        createMockTradeOrder({ id: 1, userId: 1, status: 'ACTIVE' }),
        createMockTradeOrder({ id: 2, userId: 1, status: 'FILLED' }),
      ];

      tradeOrdersCacheService.findByUserId.mockResolvedValue(mockOrders);

      const result = await controller.getUserOrders(mockRequest);

      expect(result).toEqual({
        orders: mockOrders,
        total: 2,
      });

      expect(tradeOrdersCacheService.findByUserId).toHaveBeenCalledWith(
        mockJwtUser.userId,
        50, // default limit
        0, // default offset
      );
    });

    it('should handle custom pagination parameters', async () => {
      const mockRequest = { user: mockJwtUser };
      const limit = '20';
      const offset = '10';

      tradeOrdersCacheService.findByUserId.mockResolvedValue([]);

      await controller.getUserOrders(mockRequest, limit, offset);

      expect(tradeOrdersCacheService.findByUserId).toHaveBeenCalledWith(
        mockJwtUser.userId,
        20,
        10,
      );
    });
  });

  describe('GET /trading/trades', () => {
    it('should return user trade history', async () => {
      const mockRequest = { user: mockJwtUser };
      const mockTrades = [
        createMockMarketTrade({
          id: 1,
          buyerUserId: 1,
          quantity: 1000,
          price: '0.15',
        }),
      ];

      marketTradesService.findByUserId.mockResolvedValue(mockTrades);

      const result = await controller.getUserTrades(mockRequest);

      expect(result).toEqual({
        trades: mockTrades,
        total: 1,
      });

      expect(marketTradesService.findByUserId).toHaveBeenCalledWith(
        mockJwtUser.userId,
        50,
        0,
      );
    });
  });

  describe('GET /trading/market-data', () => {
    it('should return market statistics', async () => {
      const mockRequest = { user: mockJwtUser };
      const mockStats = {
        totalVolume24h: 50000,
        priceChange24h: 5.2,
        highPrice24h: 0.18,
        lowPrice24h: 0.14,
        lastPrice: 0.16,
        activeOrders: 25,
      };

      tradeOrdersCacheService.findActiveOrders.mockResolvedValue([]);
      marketTradesService.getTradingStats.mockResolvedValue(mockStats);

      const result = await controller.getMarketData(mockRequest);

      expect(result).toEqual({
        stats: mockStats,
        orderBook: {
          bids: [],
          asks: [],
        },
      });
    });
  });

  describe('GET /trading/balance/:tokenType', () => {
    const mockWallet = createMockWallet({
      address: '0x123abc456def',
      userId: 1,
    });

    beforeEach(() => {
      walletsService.findByUserId.mockResolvedValue(mockWallet);
    });

    it('should return token balance', async () => {
      const mockRequest = { user: mockJwtUser };
      const tokenType = 'ETK';

      blockchainService.getTokenBalance.mockResolvedValue(
        '1500000000000000000',
      ); // 1.5 ETK

      const result = await controller.getTokenBalance(tokenType, mockRequest);

      expect(result).toEqual({
        tokenType: 'ETK',
        balance: '1500000000000000000',
        formattedBalance: '1.5',
        walletAddress: mockWallet.address,
      });

      expect(blockchainService.getTokenBalance).toHaveBeenCalledWith(
        mockWallet.address,
        'ETK',
      );
    });

    it('should handle invalid token type', async () => {
      const mockRequest = { user: mockJwtUser };
      const invalidTokenType = 'INVALID';

      await expect(
        controller.getTokenBalance(invalidTokenType, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle wallet not found', async () => {
      const mockRequest = { user: mockJwtUser };
      const tokenType = 'ETK';

      walletsService.findByUserId.mockResolvedValue(null);

      await expect(
        controller.getTokenBalance(tokenType, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Parameter Validation', () => {
    it('should validate order quantity', () => {
      const invalidQuantities = [-1, 0, 'invalid', null, undefined];

      invalidQuantities.forEach((quantity) => {
        expect(() => {
          (controller as any).validateOrderParameters({
            quantity,
            price: 0.15,
          });
        }).toThrow();
      });
    });

    it('should validate order price', () => {
      const invalidPrices = [-1, 0, 'invalid', null, undefined];

      invalidPrices.forEach((price) => {
        expect(() => {
          (controller as any).validateOrderParameters({ quantity: 100, price });
        }).toThrow();
      });
    });

    it('should accept valid order parameters', () => {
      expect(() => {
        (controller as any).validateOrderParameters({
          quantity: 100,
          price: 0.15,
        });
      }).not.toThrow();
    });
  });

  describe('Wallet Ownership Verification', () => {
    it('should verify wallet ownership successfully', async () => {
      const walletAddress = '0x123abc456def';
      const userId = 1;
      const mockWallet = createMockWallet({ address: walletAddress, userId });

      walletsService.findByAddress.mockResolvedValue(mockWallet);

      await expect(
        (controller as any).verifyWalletOwnership(walletAddress, userId),
      ).resolves.not.toThrow();
    });

    it('should reject unowned wallet', async () => {
      const walletAddress = '0x123abc456def';
      const userId = 1;
      const mockWallet = createMockWallet({
        address: walletAddress,
        userId: 999,
      });

      walletsService.findByAddress.mockResolvedValue(mockWallet);

      await expect(
        (controller as any).verifyWalletOwnership(walletAddress, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle wallet not found', async () => {
      const walletAddress = '0x123abc456def';
      const userId = 1;

      walletsService.findByAddress.mockResolvedValue(null);

      await expect(
        (controller as any).verifyWalletOwnership(walletAddress, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Error Handling', () => {
    it('should handle blockchain service errors gracefully', async () => {
      const mockRequest = { user: mockJwtUser };
      const mockWallet = createMockWallet({ address: '0x123', userId: 1 });

      walletsService.findByAddress.mockResolvedValue(mockWallet);
      blockchainService.placeBuyOrder.mockRejectedValue(
        new Error('Insufficient funds'),
      );

      const buyOrder = {
        walletAddress: '0x123',
        orderType: 'BID' as const,
        quantity: 1000,
        price: 0.15,
      };

      await expect(
        controller.placeBuyOrder(buyOrder, mockRequest),
      ).rejects.toThrow('Insufficient funds');
    });

    it('should handle database service errors', async () => {
      const mockRequest = { user: mockJwtUser };

      tradeOrdersCacheService.findByUserId.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.getUserOrders(mockRequest)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('Response Formatting', () => {
    it('should format token balances correctly', () => {
      const weiBalance = '1500000000000000000'; // 1.5 ETH in wei
      const formatted = (controller as any).formatTokenBalance(weiBalance);

      expect(formatted).toBe('1.5');
    });

    it('should handle zero balance formatting', () => {
      const weiBalance = '0';
      const formatted = (controller as any).formatTokenBalance(weiBalance);

      expect(formatted).toBe('0.0');
    });

    it('should handle large balance formatting', () => {
      const weiBalance = '1000000000000000000000'; // 1000 ETH in wei
      const formatted = (controller as any).formatTokenBalance(weiBalance);

      expect(formatted).toBe('1000.0');
    });
  });
});
