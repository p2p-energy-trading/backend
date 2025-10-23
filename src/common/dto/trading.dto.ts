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

export class PlaceOrderResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Blockchain transaction hash',
    example:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  transactionHash: string;

  @ApiProperty({
    description: 'Response message',
    example: 'ASK order placed',
  })
  message: string;
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
