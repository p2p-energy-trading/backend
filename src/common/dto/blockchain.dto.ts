import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsNotEmpty, Min } from 'class-validator';

export enum ConversionDirection {
  ON_RAMP = 'on-ramp',
  OFF_RAMP = 'off-ramp',
}

/**
 * DTO for IDRS conversion in blockchain controller
 * Used for simulated on-ramp (IDR → IDRS) and off-ramp (IDRS → IDR) conversions
 */
export class ConvertIDRSDto {
  @ApiProperty({
    description: 'Wallet address to receive/send IDRS',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @IsNotEmpty({ message: 'Wallet address is required' })
  walletAddress: string;

  @ApiProperty({
    description: 'Amount to convert (in IDR for on-ramp, IDRS for off-ramp)',
    example: 100000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Amount must be greater than or equal to 0' })
  amount: number;

  @ApiProperty({
    description:
      'Conversion direction: on-ramp (IDR → IDRS), off-ramp (IDRS → IDR)',
    enum: ConversionDirection,
    example: 'on-ramp',
  })
  @IsEnum(ConversionDirection, {
    message: 'Direction must be either "on-ramp" or "off-ramp"',
  })
  direction: ConversionDirection;
}

/**
 * IDRS conversion data (inside ResponseFormatter wrapper)
 */
export class ConvertIDRSDataDto {
  @ApiProperty({
    description: 'Conversion direction',
    example: 'on-ramp',
  })
  direction: string;

  @ApiProperty({
    description: 'Amount converted',
    example: 100000,
  })
  amount: number;

  @ApiProperty({
    description: 'Wallet address',
    example: '0x1234567890123456789012345678901234567890',
  })
  walletAddress: string;

  @ApiProperty({
    description: 'Blockchain transaction hash',
    example:
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  transactionHash: string;

  @ApiProperty({
    description: 'Conversion timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  timestamp: string;
}

/**
 * Response DTO for successful IDRS conversion with ResponseFormatter wrapper
 */
export class ConvertIDRSResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'IDRS conversion successful',
  })
  message: string;

  @ApiProperty({
    description: 'Conversion data',
    type: ConvertIDRSDataDto,
  })
  data: ConvertIDRSDataDto;

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

// ==================== NETWORK & CONTRACTS ====================

/**
 * Network Information Data
 */
export class NetworkInfoDataDto {
  @ApiProperty({
    description: 'RPC URL',
    example: 'http://localhost:8545',
  })
  rpcUrl: string;

  @ApiProperty({
    description: 'Network name',
    example: 'Private Ethereum Network',
  })
  networkName: string;

  @ApiProperty({
    description: 'Connection status',
    example: true,
  })
  connected: boolean;
}

/**
 * Network Information Response
 */
export class NetworkInfoResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Network information retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Network information',
    type: NetworkInfoDataDto,
  })
  data: NetworkInfoDataDto;

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
 * Contract Addresses Data
 */
export class ContractAddressesDataDto {
  @ApiProperty({
    description: 'ETK Token contract address',
    example: '0x1234567890123456789012345678901234567890',
  })
  etkToken: string | null;

  @ApiProperty({
    description: 'IDRS Token contract address',
    example: '0x2345678901234567890123456789012345678901',
  })
  idrsToken: string | null;

  @ApiProperty({
    description: 'Market contract address',
    example: '0x3456789012345678901234567890123456789012',
  })
  market: string | null;

  @ApiProperty({
    description: 'Energy Converter contract address',
    example: '0x4567890123456789012345678901234567890123',
  })
  energyConverter: string | null;
}

/**
 * Contract Addresses Response
 */
export class ContractAddressesResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Contract addresses retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Contract addresses',
    type: ContractAddressesDataDto,
  })
  data: ContractAddressesDataDto;

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
