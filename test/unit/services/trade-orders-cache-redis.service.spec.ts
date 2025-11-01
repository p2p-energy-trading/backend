import { Test, TestingModule } from '@nestjs/testing';
import { TradeOrdersCacheRedisService } from '../../../src/services/trading/trade-orders-cache-redis.service';
import {
  RedisOrdersService,
  OrderData,
} from '../../../src/services/trading/redis-orders.service';
import { CreateTradeOrdersCacheInput } from '../../../src/models/tradeOrderCache/dto/tradeOrderCache.input';
import { TradeOrdersCacheArgs } from '../../../src/models/tradeOrderCache/dto/tradeOrderCache.args';
import { OrderType, OrderStatus } from '../../../src/common/enums';

describe('TradeOrdersCacheRedisService - Unit Tests', () => {
  let service: TradeOrdersCacheRedisService;
  let redisOrdersService: jest.Mocked<RedisOrdersService>;

  const mockOrderData: OrderData = {
    orderId: 'order-123',
    prosumerId: 'prosumer-1',
    walletAddress: '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9',
    orderType: OrderType.BID,
    pair: 'ETK/IDRS',
    amountEtk: 10,
    priceIdrsPerEtk: 1500,
    totalIdrsValue: 15000,
    statusOnChain: OrderStatus.OPEN,
    createdAtOnChain: '2025-01-01T00:00:00.000Z',
    updatedAtCache: '2025-01-01T00:00:00.000Z',
    blockchainTxHashPlaced: '0xabc123',
    blockchainTxHashFilled: '',
    blockchainTxHashCancelled: '',
  };

  const mockOrderData2: OrderData = {
    orderId: 'order-456',
    prosumerId: 'prosumer-2',
    walletAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    orderType: OrderType.ASK,
    pair: 'ETK/IDRS',
    amountEtk: 5,
    priceIdrsPerEtk: 1550,
    totalIdrsValue: 7750,
    statusOnChain: OrderStatus.OPEN,
    createdAtOnChain: '2025-01-01T01:00:00.000Z',
    updatedAtCache: '2025-01-01T01:00:00.000Z',
    blockchainTxHashPlaced: '0xdef456',
  };

  beforeEach(async () => {
    const mockRedisOrdersService = {
      getAllOrders: jest.fn(),
      getOpenOrPartiallyFilledOrders: jest.fn(),
      getOrder: jest.fn(),
      setOrder: jest.fn(),
      updateOrder: jest.fn(),
      deleteOrder: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeOrdersCacheRedisService,
        {
          provide: RedisOrdersService,
          useValue: mockRedisOrdersService,
        },
      ],
    }).compile();

    service = module.get<TradeOrdersCacheRedisService>(
      TradeOrdersCacheRedisService,
    );
    redisOrdersService = module.get(RedisOrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have redisOrdersService injected', () => {
      expect(redisOrdersService).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all orders when no filters provided', async () => {
      redisOrdersService.getAllOrders.mockResolvedValueOnce([
        mockOrderData,
        mockOrderData2,
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].orderId).toBe('order-123');
      expect(result[1].orderId).toBe('order-456');
      expect(redisOrdersService.getAllOrders).toHaveBeenCalledWith();
    });

    it('should filter by orderType', async () => {
      redisOrdersService.getAllOrders.mockResolvedValueOnce([mockOrderData]);

      const args: TradeOrdersCacheArgs = { orderType: OrderType.BID };
      const result = await service.findAll(args);

      expect(result).toHaveLength(1);
      expect(result[0].orderType).toBe(OrderType.BID);
      expect(redisOrdersService.getAllOrders).toHaveBeenCalledWith({
        orderType: OrderType.BID,
      });
    });

    it('should filter by prosumerId', async () => {
      redisOrdersService.getAllOrders.mockResolvedValueOnce([mockOrderData]);

      const args: TradeOrdersCacheArgs = { prosumerId: 'prosumer-1' };
      const result = await service.findAll(args);

      expect(result).toHaveLength(1);
      expect(result[0].prosumerId).toBe('prosumer-1');
      expect(redisOrdersService.getAllOrders).toHaveBeenCalledWith({
        prosumerId: 'prosumer-1',
      });
    });

    it('should filter by statusOnChain', async () => {
      redisOrdersService.getAllOrders.mockResolvedValueOnce([mockOrderData]);

      const args: TradeOrdersCacheArgs = { statusOnChain: OrderStatus.OPEN };
      const result = await service.findAll(args);

      expect(result).toHaveLength(1);
      expect(result[0].statusOnChain).toBe(OrderStatus.OPEN);
      expect(redisOrdersService.getAllOrders).toHaveBeenCalledWith({
        statusOnChain: OrderStatus.OPEN,
      });
    });

    it('should apply client-side filtering for walletAddress', async () => {
      redisOrdersService.getAllOrders.mockResolvedValueOnce([
        mockOrderData,
        mockOrderData2,
      ]);

      const args: TradeOrdersCacheArgs = {
        walletAddress: '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9',
      };
      const result = await service.findAll(args);

      expect(result).toHaveLength(1);
      expect(result[0].walletAddress).toBe(
        '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9',
      );
    });

    it('should apply client-side filtering for pair', async () => {
      const orderWithDifferentPair = {
        ...mockOrderData2,
        pair: 'BTC/USDT',
      };
      redisOrdersService.getAllOrders.mockResolvedValueOnce([
        mockOrderData,
        orderWithDifferentPair,
      ]);

      const args: TradeOrdersCacheArgs = { pair: 'ETK/IDRS' };
      const result = await service.findAll(args);

      expect(result).toHaveLength(1);
      expect(result[0].pair).toBe('ETK/IDRS');
    });

    it('should apply client-side filtering for amountEtk', async () => {
      redisOrdersService.getAllOrders.mockResolvedValueOnce([
        mockOrderData,
        mockOrderData2,
      ]);

      const args: TradeOrdersCacheArgs = { amountEtk: 10 };
      const result = await service.findAll(args);

      expect(result).toHaveLength(1);
      expect(result[0].amountEtk).toBe(10);
    });

    it('should apply client-side filtering for priceIdrsPerEtk', async () => {
      redisOrdersService.getAllOrders.mockResolvedValueOnce([
        mockOrderData,
        mockOrderData2,
      ]);

      const args: TradeOrdersCacheArgs = { priceIdrsPerEtk: 1500 };
      const result = await service.findAll(args);

      expect(result).toHaveLength(1);
      expect(result[0].priceIdrsPerEtk).toBe(1500);
    });

    it('should return empty array on error', async () => {
      redisOrdersService.getAllOrders.mockRejectedValueOnce(
        new Error('Redis error'),
      );

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOpenOrPartiallyFilledOrders', () => {
    it('should return open or partially filled orders', async () => {
      const openOrder = { ...mockOrderData, statusOnChain: OrderStatus.OPEN };
      const partiallyFilledOrder = {
        ...mockOrderData2,
        statusOnChain: OrderStatus.PARTIALLY_FILLED,
      };

      redisOrdersService.getOpenOrPartiallyFilledOrders.mockResolvedValueOnce([
        openOrder,
        partiallyFilledOrder,
      ]);

      const result = await service.findOpenOrPartiallyFilledOrders();

      expect(result).toHaveLength(2);
      expect(result[0].statusOnChain).toBe(OrderStatus.OPEN);
      expect(result[1].statusOnChain).toBe(OrderStatus.PARTIALLY_FILLED);
      expect(
        redisOrdersService.getOpenOrPartiallyFilledOrders,
      ).toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      redisOrdersService.getOpenOrPartiallyFilledOrders.mockRejectedValueOnce(
        new Error('Redis error'),
      );

      const result = await service.findOpenOrPartiallyFilledOrders();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return order by orderId', async () => {
      redisOrdersService.getOrder.mockResolvedValueOnce(mockOrderData);

      const result = await service.findOne('order-123');

      expect(result).toEqual(mockOrderData);
      expect(result.orderId).toBe('order-123');
      expect(redisOrdersService.getOrder).toHaveBeenCalledWith('order-123');
    });

    it('should throw error when order not found', async () => {
      redisOrdersService.getOrder.mockResolvedValueOnce(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Order with orderId non-existent not found',
      );
    });

    it('should throw error on Redis error', async () => {
      redisOrdersService.getOrder.mockRejectedValueOnce(
        new Error('Redis connection error'),
      );

      await expect(service.findOne('order-123')).rejects.toThrow(
        'Redis connection error',
      );
    });
  });

  describe('create', () => {
    it('should create a new order with all fields', async () => {
      const input: CreateTradeOrdersCacheInput = {
        orderId: 'order-789',
        prosumerId: 'prosumer-3',
        walletAddress: '0x123abc',
        orderType: OrderType.BID,
        pair: 'ETK/IDRS',
        amountEtk: 20,
        priceIdrsPerEtk: 1600,
        totalIdrsValue: 32000,
        statusOnChain: OrderStatus.OPEN,
        createdAtOnChain: '2025-01-02T00:00:00.000Z',
        updatedAtCache: '2025-01-02T00:00:00.000Z',
        blockchainTxHashPlaced: '0xghi789',
        blockchainTxHashFilled: '',
      };

      redisOrdersService.setOrder.mockResolvedValueOnce(undefined);

      const result = await service.create(input);

      expect(result.orderId).toBe('order-789');
      expect(result.prosumerId).toBe('prosumer-3');
      expect(result.amountEtk).toBe(20);
      expect(redisOrdersService.setOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-789',
          prosumerId: 'prosumer-3',
          amountEtk: 20,
        }),
      );
    });

    it('should create order with default values for optional fields', async () => {
      const input: CreateTradeOrdersCacheInput = {
        orderId: 'order-999',
        prosumerId: 'prosumer-4',
        walletAddress: '0x456def',
        orderType: OrderType.ASK,
        pair: 'ETK/IDRS',
        amountEtk: 15,
        priceIdrsPerEtk: 1700,
        statusOnChain: OrderStatus.OPEN,
        createdAtOnChain: new Date().toISOString(),
        updatedAtCache: new Date().toISOString(),
      };

      redisOrdersService.setOrder.mockResolvedValueOnce(undefined);

      const result = await service.create(input);

      expect(result.orderId).toBe('order-999');
      expect(result.totalIdrsValue).toBe(0); // default
      expect(result.blockchainTxHashPlaced).toBe(''); // default
      expect(result.blockchainTxHashCancelled).toBe(''); // default
      expect(result.createdAtOnChain).toBeDefined();
      expect(result.updatedAtCache).toBeDefined();
    });

    it('should throw error on Redis error', async () => {
      const input: CreateTradeOrdersCacheInput = {
        orderId: 'order-error',
        prosumerId: 'prosumer-1',
        walletAddress: '0x123',
        orderType: OrderType.BID,
        pair: 'ETK/IDRS',
        amountEtk: 10,
        priceIdrsPerEtk: 1500,
        statusOnChain: OrderStatus.OPEN,
        createdAtOnChain: new Date().toISOString(),
        updatedAtCache: new Date().toISOString(),
      };

      redisOrdersService.setOrder.mockRejectedValueOnce(
        new Error('Redis write error'),
      );

      await expect(service.create(input)).rejects.toThrow('Redis write error');
    });
  });

  describe('update', () => {
    it('should update order with provided fields', async () => {
      const updatedOrder = {
        ...mockOrderData,
        amountEtk: 15,
        statusOnChain: OrderStatus.PARTIALLY_FILLED,
      };

      redisOrdersService.updateOrder.mockResolvedValueOnce(updatedOrder);

      const input: CreateTradeOrdersCacheInput = {
        orderId: 'order-123',
        prosumerId: 'prosumer-1',
        walletAddress: '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9',
        orderType: OrderType.BID,
        pair: 'ETK/IDRS',
        amountEtk: 15,
        priceIdrsPerEtk: 1500,
        statusOnChain: OrderStatus.PARTIALLY_FILLED,
        createdAtOnChain: '2025-01-01T00:00:00.000Z',
        updatedAtCache: new Date().toISOString(),
      };

      const result = await service.update('order-123', input);

      expect(result.amountEtk).toBe(15);
      expect(result.statusOnChain).toBe(OrderStatus.PARTIALLY_FILLED);
      expect(redisOrdersService.updateOrder).toHaveBeenCalledWith(
        'order-123',
        expect.objectContaining({
          amountEtk: 15,
          statusOnChain: OrderStatus.PARTIALLY_FILLED,
        }),
      );
    });

    it('should only update defined fields', async () => {
      const updatedOrder = {
        ...mockOrderData,
        statusOnChain: OrderStatus.FILLED,
      };

      redisOrdersService.updateOrder.mockResolvedValueOnce(updatedOrder);

      const input: CreateTradeOrdersCacheInput = {
        orderId: 'order-123',
        prosumerId: 'prosumer-1',
        walletAddress: '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9',
        orderType: OrderType.BID,
        pair: 'ETK/IDRS',
        amountEtk: 10,
        priceIdrsPerEtk: 1500,
        statusOnChain: OrderStatus.FILLED,
        blockchainTxHashFilled: '0xfilled123',
        createdAtOnChain: '2025-01-01T00:00:00.000Z',
        updatedAtCache: new Date().toISOString(),
      };

      await service.update('order-123', input);

      expect(redisOrdersService.updateOrder).toHaveBeenCalledWith(
        'order-123',
        expect.objectContaining({
          statusOnChain: OrderStatus.FILLED,
          blockchainTxHashFilled: '0xfilled123',
        }),
      );
    });

    it('should throw error when order not found', async () => {
      redisOrdersService.updateOrder.mockResolvedValueOnce(null);

      const input: CreateTradeOrdersCacheInput = {
        orderId: 'non-existent',
        prosumerId: 'prosumer-1',
        walletAddress: '0x123',
        orderType: OrderType.BID,
        pair: 'ETK/IDRS',
        amountEtk: 10,
        priceIdrsPerEtk: 1500,
        statusOnChain: OrderStatus.OPEN,
        createdAtOnChain: new Date().toISOString(),
        updatedAtCache: new Date().toISOString(),
      };

      await expect(service.update('non-existent', input)).rejects.toThrow(
        'Order non-existent not found for update',
      );
    });

    it('should throw error on Redis error', async () => {
      redisOrdersService.updateOrder.mockRejectedValueOnce(
        new Error('Redis update error'),
      );

      const input: CreateTradeOrdersCacheInput = {
        orderId: 'order-123',
        prosumerId: 'prosumer-1',
        walletAddress: '0x123',
        orderType: OrderType.BID,
        pair: 'ETK/IDRS',
        amountEtk: 10,
        priceIdrsPerEtk: 1500,
        statusOnChain: OrderStatus.OPEN,
        createdAtOnChain: new Date().toISOString(),
        updatedAtCache: new Date().toISOString(),
      };

      await expect(service.update('order-123', input)).rejects.toThrow(
        'Redis update error',
      );
    });
  });

  describe('remove', () => {
    it('should successfully remove order', async () => {
      redisOrdersService.deleteOrder.mockResolvedValueOnce(true);

      const result = await service.remove('order-123');

      expect(result).toBe(true);
      expect(redisOrdersService.deleteOrder).toHaveBeenCalledWith('order-123');
    });

    it('should return false when order not found', async () => {
      redisOrdersService.deleteOrder.mockResolvedValueOnce(false);

      const result = await service.remove('non-existent');

      expect(result).toBe(false);
    });

    it('should return false on Redis error', async () => {
      redisOrdersService.deleteOrder.mockRejectedValueOnce(
        new Error('Redis delete error'),
      );

      const result = await service.remove('order-123');

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return order statistics', async () => {
      const mockStats = {
        totalOrders: 10,
        ordersByType: { BID: 6, ASK: 4 },
        ordersByStatus: {
          OPEN: 7,
          PARTIALLY_FILLED: 2,
          FILLED: 1,
        },
      };

      redisOrdersService.getStats.mockResolvedValueOnce(mockStats);

      const result = await service.getStats();

      expect(result).toEqual(mockStats);
      expect(result.totalOrders).toBe(10);
      expect(result.ordersByType.BID).toBe(6);
      expect(redisOrdersService.getStats).toHaveBeenCalled();
    });

    it('should return default stats on error', async () => {
      redisOrdersService.getStats.mockRejectedValueOnce(
        new Error('Redis stats error'),
      );

      const result = await service.getStats();

      expect(result).toEqual({
        totalOrders: 0,
        ordersByType: { BID: 0, ASK: 0 },
        ordersByStatus: {},
      });
    });
  });
});
