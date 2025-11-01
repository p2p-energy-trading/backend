import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsNotEmpty, Min } from 'class-validator';

export enum OrderType {
  BID = 'BID',
  ASK = 'ASK',
}

export class PlaceOrderDto {
  @ApiProperty({
    description: 'Ethereum wallet address of the prosumer',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({
    description: 'Type of order: BID (buy) or ASK (sell)',
    enum: OrderType,
    example: 'ASK',
  })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({
    description: 'Quantity of ETK tokens to trade',
    example: 100,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({
    description: 'Price in IDRS per ETK token',
    example: 1500,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price: number;
}

/**
 * Place order response data (inside ResponseFormatter wrapper)
 */
export class PlaceOrderDataDto {
  @ApiProperty({
    description: 'Blockchain transaction hash',
    example:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  transactionHash: string;

  @ApiProperty({
    description: 'Order ID',
    example: '1',
  })
  orderId?: string;
}

/**
 * Place order response with ResponseFormatter wrapper
 */
export class PlaceOrderResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'ASK order placed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Order placement data',
    type: PlaceOrderDataDto,
  })
  data: PlaceOrderDataDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    timestamp: string;
  };
}

export class CancelOrderDto {
  @ApiProperty({
    description: 'Ethereum wallet address of the prosumer',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({
    description: 'Order ID to cancel',
    example: '1',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;
}

export class OrderResponseDto {
  @ApiProperty({ example: '1' })
  orderId: string;

  @ApiProperty({ example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' })
  walletAddress: string;

  @ApiProperty({ example: 'ASK' })
  orderType: string;

  @ApiProperty({ example: '100' })
  quantity: string;

  @ApiProperty({ example: '1500' })
  price: string;

  @ApiProperty({ example: 'OPEN' })
  status: string;

  @ApiProperty({ example: '2025-10-23T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '0x1234...abcdef' })
  blockchainTxHash: string;
}

export class TradeResponseDto {
  @ApiProperty({ example: '1' })
  tradeId: string;

  @ApiProperty({ example: '0x742d35...7595f0bEb' })
  buyerWalletAddress: string;

  @ApiProperty({ example: '0x842d45...8695f1cEc' })
  sellerWalletAddress: string;

  @ApiProperty({ example: '50' })
  tradedEtkAmount: string;

  @ApiProperty({ example: '1500' })
  priceIdrsPerEtk: string;

  @ApiProperty({ example: '2025-10-23T10:35:00.000Z' })
  tradeTimestamp: string;

  @ApiProperty({ example: '0xabcd...1234' })
  blockchainTxHash: string;
}

export class OrderBookSummaryDto {
  @ApiProperty({
    description: 'Summary statistics of the order book',
    example: {
      totalBids: 15,
      totalAsks: 12,
      highestBid: '1450',
      lowestAsk: '1550',
      spread: '100',
      spreadPercentage: '6.67',
    },
  })
  summary: {
    totalBids: number;
    totalAsks: number;
    highestBid: string;
    lowestAsk: string;
    spread: string;
    spreadPercentage: string;
  };

  @ApiProperty({
    description: 'List of bid orders',
    type: [OrderResponseDto],
  })
  bids: OrderResponseDto[];

  @ApiProperty({
    description: 'List of ask orders',
    type: [OrderResponseDto],
  })
  asks: OrderResponseDto[];
}

// ==================== RESPONSE WRAPPERS ====================

/**
 * Orders List Response
 */
export class OrdersListResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Orders retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of orders',
    type: [OrderResponseDto],
  })
  data: OrderResponseDto[];

  @ApiProperty({
    description: 'Metadata with count',
    example: {
      count: 50,
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    count: number;
    timestamp: string;
  };
}

/**
 * Order Book Detailed Data
 */
export class OrderBookDetailedDataDto {
  @ApiProperty({
    description: 'Buy orders (BIDs)',
    type: [OrderResponseDto],
  })
  buyOrders: OrderResponseDto[];

  @ApiProperty({
    description: 'Sell orders (ASKs)',
    type: [OrderResponseDto],
  })
  sellOrders: OrderResponseDto[];
}

/**
 * Order Book Detailed Response
 */
export class OrderBookDetailedResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Order book retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Order book data',
    type: OrderBookDetailedDataDto,
  })
  data: OrderBookDetailedDataDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    timestamp: string;
  };
}

/**
 * Order Book Summary Response
 */
export class OrderBookSummaryResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Order book summary retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Order book summary data',
    type: OrderBookSummaryDto,
  })
  data: OrderBookSummaryDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    timestamp: string;
  };
}

/**
 * Trades List Response
 */
export class TradesListResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Trades retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of trades',
    type: [TradeResponseDto],
  })
  data: TradeResponseDto[];

  @ApiProperty({
    description: 'Metadata with count',
    example: {
      count: 50,
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    count: number;
    timestamp: string;
  };
}

/**
 * Market Statistics Data
 */
export class MarketStatsDataDto {
  @ApiProperty({
    description: 'Last traded price',
    example: '1500',
  })
  lastPrice: string;

  @ApiProperty({
    description: '24h price change',
    example: '50',
  })
  priceChange24h: string;

  @ApiProperty({
    description: '24h price change percentage',
    example: '3.45',
  })
  priceChangePercent24h: string;

  @ApiProperty({
    description: '24h high price',
    example: '1550',
  })
  high24h: string;

  @ApiProperty({
    description: '24h low price',
    example: '1400',
  })
  low24h: string;

  @ApiProperty({
    description: '24h trading volume in ETK',
    example: '1250.5',
  })
  volume24h: string;

  @ApiProperty({
    description: 'Total number of trades',
    example: 450,
  })
  totalTrades: number;

  @ApiProperty({
    description: 'Number of active buy orders',
    example: 15,
  })
  activeBuyOrders: number;

  @ApiProperty({
    description: 'Number of active sell orders',
    example: 12,
  })
  activeSellOrders: number;
}

/**
 * Market Statistics Response
 */
export class MarketStatsResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Market statistics retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Market statistics data',
    type: MarketStatsDataDto,
  })
  data: MarketStatsDataDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    timestamp: string;
  };
}

/**
 * Token Balance Data
 */
export class TokenBalanceDataDto {
  @ApiProperty({
    description: 'ETK token balance',
    example: '150.5',
  })
  etkBalance: string;

  @ApiProperty({
    description: 'IDRS token balance',
    example: '500000',
  })
  idrsBalance: string;
}

/**
 * Token Balance Response
 */
export class TokenBalanceResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Balances retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Token balances',
    type: TokenBalanceDataDto,
  })
  data: TokenBalanceDataDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    timestamp: string;
  };
}

/**
 * Market Supply Data
 */
export class MarketSupplyDataDto {
  @ApiProperty({
    description: 'Total supply',
    example: '10000',
  })
  totalSupply: string;

  @ApiProperty({
    description: 'Circulating supply',
    example: '8500',
  })
  circulatingSupply: string;
}

/**
 * Market Supply Response
 */
export class MarketSupplyResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Supply data retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Supply data',
    type: MarketSupplyDataDto,
  })
  data: MarketSupplyDataDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    timestamp: string;
  };
}

/**
 * Market Liquidity Data
 */
export class MarketLiquidityDataDto {
  @ApiProperty({
    description: 'Total ETK liquidity',
    example: '5000',
  })
  totalEtkLiquidity: string;

  @ApiProperty({
    description: 'Total IDRS liquidity',
    example: '7500000',
  })
  totalIdrsLiquidity: string;

  @ApiProperty({
    description: 'Liquidity ratio',
    example: '1.5',
  })
  liquidityRatio: string;
}

/**
 * Market Liquidity Response
 */
export class MarketLiquidityResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Liquidity data retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Liquidity data',
    type: MarketLiquidityDataDto,
  })
  data: MarketLiquidityDataDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    timestamp: string;
  };
}

/**
 * Price History Point
 */
export class PriceHistoryPointDto {
  @ApiProperty({
    description: 'Timestamp',
    example: '2025-10-23T10:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Price in IDRS',
    example: '1500',
  })
  price: string;

  @ApiProperty({
    description: 'Trading volume',
    example: '125.5',
  })
  volume?: string;
}

/**
 * Price History Response
 */
export class PriceHistoryResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Price history retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of price history points',
    type: [PriceHistoryPointDto],
  })
  data: PriceHistoryPointDto[];

  @ApiProperty({
    description: 'Metadata with count',
    example: {
      count: 168,
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    count: number;
    timestamp: string;
  };
}

/**
 * Candle Data
 */
export class CandleDataDto {
  @ApiProperty({
    description: 'Candle timestamp',
    example: '2025-10-23T10:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Opening price',
    example: '1450',
  })
  open: string;

  @ApiProperty({
    description: 'Highest price',
    example: '1550',
  })
  high: string;

  @ApiProperty({
    description: 'Lowest price',
    example: '1400',
  })
  low: string;

  @ApiProperty({
    description: 'Closing price',
    example: '1500',
  })
  close: string;

  @ApiProperty({
    description: 'Trading volume',
    example: '250.5',
  })
  volume: string;

  @ApiProperty({
    description: 'Number of trades',
    example: 45,
  })
  trades: number;
}

/**
 * Candles Response
 */
export class CandlesResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Candle data retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of candle data',
    type: [CandleDataDto],
  })
  data: CandleDataDto[];

  @ApiProperty({
    description: 'Metadata with count and interval',
    example: {
      count: 24,
      interval: '1h',
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    count: number;
    interval: string;
    timestamp: string;
  };
}

/**
 * Trading Performance Data
 */
export class TradingPerformanceDataDto {
  @ApiProperty({
    description: 'Total trades executed',
    example: 125,
  })
  totalTrades: number;

  @ApiProperty({
    description: 'Total ETK volume traded',
    example: '5000.5',
  })
  totalEtkVolume: string;

  @ApiProperty({
    description: 'Total IDRS value',
    example: '7500750',
  })
  totalIdrsValue: string;

  @ApiProperty({
    description: 'Average trade size in ETK',
    example: '40.0',
  })
  averageTradeSize: string;

  @ApiProperty({
    description: 'Profit/Loss in IDRS',
    example: '15000',
  })
  profitLoss?: string;

  @ApiProperty({
    description: 'Win rate percentage',
    example: '65.5',
  })
  winRate?: string;
}

/**
 * Trading Performance Response
 */
export class TradingPerformanceResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Trading performance retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Trading performance data',
    type: TradingPerformanceDataDto,
  })
  data: TradingPerformanceDataDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    timestamp: string;
  };
}

/**
 * Cancel Order Response
 */
export class CancelOrderResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Order canceled successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Transaction data',
    example: {
      transactionHash: '0x1234567890abcdef...',
    },
  })
  data: {
    transactionHash: string;
  };

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    timestamp: string;
  };
}
