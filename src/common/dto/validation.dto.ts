import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  ValidateNested,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum OrderType {
  BID = 'BID',
  ASK = 'ASK',
}

export enum DeviceCommandType {
  GRID_CONTROL = 'GRID_CONTROL',
  ENERGY_RESET = 'ENERGY_RESET',
  SETTLEMENT_RESET = 'SETTLEMENT_RESET',
  CONFIG_UPDATE = 'CONFIG_UPDATE',
  COMPONENT_CONTROL = 'COMPONENT_CONTROL',
}

export class WalletCreateDto {
  @ApiProperty({ description: 'Wallet name for identification' })
  @IsNotEmpty()
  @IsString()
  walletName: string;

  @ApiProperty({
    description: 'Method of wallet import',
    enum: ['GENERATED', 'IMPORTED'],
  })
  @IsEnum(['GENERATED', 'IMPORTED'])
  importMethod: string;

  @ApiProperty({
    description: 'Private key (for imported wallets)',
    required: false,
  })
  @IsOptional()
  @IsString()
  privateKey?: string;
}

export class DeviceCommandDto {
  @ApiProperty({ description: 'Command type', enum: DeviceCommandType })
  @IsEnum(DeviceCommandType)
  commandType: DeviceCommandType;

  @ApiProperty({ description: 'Command payload as JSON string' })
  @IsString()
  command: string;

  @ApiProperty({
    description: 'Command timeout in seconds',
    required: false,
    minimum: 10,
    maximum: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(300)
  timeoutSeconds?: number = 60;
}

export class TokenApprovalDto {
  @ApiProperty({ description: 'Wallet address that owns the tokens' })
  @IsNotEmpty()
  @IsString()
  walletAddress: string;

  @ApiProperty({ description: 'Token contract address' })
  @IsNotEmpty()
  @IsString()
  tokenContract: string;

  @ApiProperty({ description: 'Spender contract address' })
  @IsNotEmpty()
  @IsString()
  spenderContract: string;

  @ApiProperty({ description: 'Amount to approve', minimum: 0.01 })
  @IsNumber()
  @IsPositive()
  amount: number;
}

export class PlaceOrderDto {
  @ApiProperty({ description: 'Wallet address placing the order' })
  @IsNotEmpty()
  @IsString()
  walletAddress: string;

  @ApiProperty({ description: 'Order type', enum: OrderType })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({ description: 'Quantity in tokens', minimum: 0.01 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Price per token', minimum: 0.01 })
  @IsNumber()
  @IsPositive()
  price: number;
}

export class CancelOrderDto {
  @ApiProperty({ description: 'Wallet address that placed the order' })
  @IsNotEmpty()
  @IsString()
  walletAddress: string;

  @ApiProperty({ description: 'Order ID to cancel' })
  @IsNotEmpty()
  @IsString()
  orderId: string;
}

export class ManualSettlementDto {
  @ApiProperty({
    description: 'Force settlement even if device is offline',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  forceSettlement?: boolean = false;
}

export class IdrsConversionDto {
  @ApiProperty({ description: 'Wallet address for conversion' })
  @IsNotEmpty()
  @IsString()
  walletAddress: string;

  @ApiProperty({
    description: 'Conversion direction',
    enum: ['IDR_TO_IDRS', 'IDRS_TO_IDR'],
  })
  @IsEnum(['IDR_TO_IDRS', 'IDRS_TO_IDR'])
  direction: string;

  @ApiProperty({ description: 'Amount to convert', minimum: 1000 })
  @IsNumber()
  @Min(1000) // Minimum 1000 IDR
  amount: number;
}

export class DeviceRegistrationDto {
  @ApiProperty({ description: 'Smart meter device ID' })
  @IsNotEmpty()
  @IsString()
  meterId: string;

  @ApiProperty({ description: 'Device name for identification' })
  @IsNotEmpty()
  @IsString()
  deviceName: string;

  @ApiProperty({ description: 'Device location description' })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({ description: 'Device capabilities as JSON' })
  @IsOptional()
  @IsString()
  capabilities?: string;
}

export class UpdateProfileDto {
  @ApiProperty({ description: 'User full name', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ description: 'User email address', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'User phone number', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ description: 'User address', required: false })
  @IsOptional()
  @IsString()
  address?: string;
}
