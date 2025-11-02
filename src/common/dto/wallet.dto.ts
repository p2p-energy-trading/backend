import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { WalletImportMethod, ConversionType } from '../enums';

export class CreateWalletDto {
  @ApiProperty({
    description: 'Custom name for the wallet',
    example: 'My Primary Wallet',
  })
  @IsString()
  @IsNotEmpty()
  walletName: string;

  @ApiProperty({
    description: 'Method to create/import wallet',
    enum: WalletImportMethod,
    example: 'GENERATED',
  })
  @IsEnum(WalletImportMethod)
  importMethod: WalletImportMethod;

  @ApiProperty({
    description:
      'Private key (required if importMethod is IMPORTED_PRIVATE_KEY)',
    example:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    required: false,
  })
  @IsString()
  @IsOptional()
  privateKey?: string;

  @ApiProperty({
    description:
      'Mnemonic phrase (required if importMethod is IMPORTED_MNEMONIC)',
    example:
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    required: false,
  })
  @IsString()
  @IsOptional()
  mnemonic?: string;
}

/**
 * Wallet creation data (inside ResponseFormatter wrapper)
 */
export class CreateWalletDataDto {
  @ApiProperty({
    description: 'Newly created wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  walletAddress: string;

  @ApiProperty({
    description: 'Wallet name',
    example: 'My Primary Wallet',
  })
  walletName: string;

  @ApiProperty({
    description: 'Whether this is the primary wallet',
    example: true,
  })
  isPrimary: boolean;

  @ApiProperty({
    description: 'ETK token balance',
    example: '0',
  })
  etkBalance: string;

  @ApiProperty({
    description: 'IDRS token balance',
    example: '0',
  })
  idrsBalance: string;
}

/**
 * Create wallet response with ResponseFormatter wrapper
 */
export class CreateWalletResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Wallet created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Wallet data',
    type: CreateWalletDataDto,
  })
  data: CreateWalletDataDto;

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

export class IdrsConversionDto {
  @ApiProperty({
    description: 'Wallet address for conversion',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({
    description:
      'Type of conversion: ON_RAMP (IDR to IDRS) or OFF_RAMP (IDRS to IDR)',
    enum: ConversionType,
    example: 'ON_RAMP',
  })
  @IsEnum(ConversionType)
  conversionType: ConversionType;

  @ApiProperty({
    description: 'Amount to convert',
    example: 100000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}

/**
 * IDRS conversion data (inside ResponseFormatter wrapper)
 */
export class IdrsConversionDataDto {
  @ApiProperty({
    description: 'Conversion ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  conversionId: string;

  @ApiProperty({
    description: 'Transaction hash on blockchain',
    example:
      '0xabcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
  })
  transactionHash: string;

  @ApiProperty({
    description: 'Conversion type',
    example: 'ON_RAMP',
  })
  conversionType: string;

  @ApiProperty({
    description: 'Amount converted',
    example: '100000',
  })
  amount: string;

  @ApiProperty({
    description: 'Exchange rate used (1:1)',
    example: '1',
  })
  exchangeRate: string;
}

/**
 * IDRS conversion response with ResponseFormatter wrapper
 */
export class IdrsConversionResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example:
      'ON_RAMP conversion successful. 100000 IDRS tokens have been minted.',
  })
  message: string;

  @ApiProperty({
    description: 'Conversion data',
    type: IdrsConversionDataDto,
  })
  data: IdrsConversionDataDto;

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

export class WalletBalanceDto {
  @ApiProperty({
    description: 'Wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  walletAddress: string;

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

  @ApiProperty({
    description: 'Native ETH balance',
    example: '0.05',
  })
  ethBalance: string;
}

export class WalletInfoDto {
  @ApiProperty({
    description: 'Wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  walletAddress: string;

  @ApiProperty({
    description: 'Wallet name',
    example: 'My Primary Wallet',
  })
  walletName: string;

  @ApiProperty({
    description: 'Is primary wallet',
    example: true,
  })
  isPrimary?: boolean;

  @ApiProperty({
    description: 'Is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Import method used',
    example: 'GENERATED',
  })
  importMethod: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-10-22T08:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last used timestamp',
    example: '2025-10-23T14:20:00.000Z',
    required: false,
  })
  lastUsedAt?: string;
}

// ==================== RESPONSE WRAPPERS ====================

/**
 * Wallet Info Single Response
 */
export class WalletInfoResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Wallet details retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Wallet information',
    type: WalletInfoDto,
  })
  data: WalletInfoDto;

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
 * Wallet List Response
 */
export class WalletListResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Wallets retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of wallet information',
    type: [WalletInfoDto],
  })
  data: WalletInfoDto[];

  @ApiProperty({
    description: 'Metadata with count',
    example: {
      count: 3,
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    count: number;
    timestamp: string;
  };
}

/**
 * Wallet Balance Data
 */
export class WalletBalanceDataDto {
  @ApiProperty({
    description: 'ETK token balance',
    example: '150.5',
  })
  ETK: string;

  @ApiProperty({
    description: 'IDRS token balance',
    example: '500000',
  })
  IDRS: string;
}

/**
 * Wallet Balance Response
 */
export class WalletBalanceResponseDto {
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
    type: WalletBalanceDataDto,
  })
  data: WalletBalanceDataDto;

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
 * IDRS Conversion Record Data (for list endpoint)
 */
export class IdrsConversionRecordDto {
  @ApiProperty({
    description: 'Conversion ID',
    example: 123,
  })
  conversionId: number;

  @ApiProperty({
    description: 'Prosumer ID',
    example: 'PROS001',
  })
  userId: string;

  @ApiProperty({
    description: 'Wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  walletAddress: string;

  @ApiProperty({
    description: 'Conversion type',
    enum: ['ON_RAMP', 'OFF_RAMP'],
    example: 'ON_RAMP',
  })
  conversionType: string;

  @ApiProperty({
    description: 'IDR amount',
    example: 100000,
  })
  idrAmount: number;

  @ApiProperty({
    description: 'IDRS token amount',
    example: 100000,
  })
  idrsAmount: number;

  @ApiProperty({
    description: 'Exchange rate (IDR to IDRS)',
    example: 1,
  })
  exchangeRate: number;

  @ApiProperty({
    description: 'Blockchain transaction hash',
    example:
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  blockchainTxHash: string;

  @ApiProperty({
    description: 'Conversion status',
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    example: 'SUCCESS',
  })
  status: string;

  @ApiProperty({
    description: 'Simulation note',
    example: 'Simulated on-ramp conversion',
  })
  simulationNote?: string;

  @ApiProperty({
    description: 'Created timestamp',
    example: '2025-11-01T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Confirmed timestamp',
    example: '2025-11-01T10:00:30.000Z',
  })
  confirmedAt?: string;
}

/**
 * IDRS Conversion List Response
 */
export class IdrsConversionListResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Conversions retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of conversion records',
    type: [IdrsConversionRecordDto],
    example: [
      {
        conversionId: 123,
        userId: 'PROS001',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        conversionType: 'ON_RAMP',
        idrAmount: 100000,
        idrsAmount: 100000,
        exchangeRate: 1,
        blockchainTxHash:
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        status: 'SUCCESS',
        simulationNote: 'Simulated on-ramp conversion',
        createdAt: '2025-11-01T10:00:00.000Z',
        confirmedAt: '2025-11-01T10:00:30.000Z',
      },
      {
        conversionId: 124,
        userId: 'PROS001',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        conversionType: 'OFF_RAMP',
        idrAmount: 50000,
        idrsAmount: 50000,
        exchangeRate: 1,
        blockchainTxHash:
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        status: 'SUCCESS',
        simulationNote: 'Simulated off-ramp conversion',
        createdAt: '2025-11-01T11:00:00.000Z',
        confirmedAt: '2025-11-01T11:00:30.000Z',
      },
    ],
  })
  data: IdrsConversionRecordDto[];

  @ApiProperty({
    description: 'Metadata with count',
    example: {
      count: 10,
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    count: number;
    timestamp: string;
  };
}

/**
 * Wallet Activation/Deactivation Data
 */
export class WalletStatusDataDto {
  @ApiProperty({
    description: 'Wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  walletAddress: string;

  @ApiProperty({
    description: 'Is wallet active',
    example: true,
  })
  isActive?: boolean;

  @ApiProperty({
    description: 'Is primary wallet',
    example: true,
  })
  isPrimary?: boolean;
}

/**
 * Wallet Status Response (Activation/Deactivation/Set Primary)
 */
export class WalletStatusResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Wallet activated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Wallet status data',
    type: WalletStatusDataDto,
  })
  data: WalletStatusDataDto;

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
 * IDRS Transaction Data
 */
export class IdrsTransactionDto {
  @ApiProperty({
    description: 'Log ID',
    example: '123',
  })
  logId: string | number | null;

  @ApiProperty({
    description: 'Transaction type',
    example: 'IDRS_CONVERSION',
  })
  transactionType: string | null;

  @ApiProperty({
    description: 'Transaction description',
    example: 'ON_RAMP conversion',
  })
  description: string | null;

  @ApiProperty({
    description: 'Transaction details object',
    example: { message: 'ON_RAMP conversion', amount: 100000 },
  })
  details: Record<string, any>;

  @ApiProperty({
    description: 'Primary amount',
    example: '100000',
  })
  amountPrimary: string | number | null;

  @ApiProperty({
    description: 'Primary currency',
    example: 'IDRS',
  })
  currencyPrimary: string | null;

  @ApiProperty({
    description: 'Secondary amount',
    example: null,
  })
  amountSecondary: string | number | null;

  @ApiProperty({
    description: 'Secondary currency',
    example: null,
  })
  currencySecondary: string | null;

  @ApiProperty({
    description: 'Blockchain transaction hash',
    example: '0xabcd...',
  })
  blockchainTxHash: string | null;

  @ApiProperty({
    description: 'Transaction timestamp',
    example: '2025-10-23T10:30:00.000Z',
  })
  transactionTimestamp: string | null;

  @ApiProperty({
    description: 'Prosumer ID (only for public/all scopes)',
    example: 'PROS001',
    required: false,
  })
  userId?: string;
}

/**
 * IDRS Transaction History Response
 */
export class IdrsTransactionHistoryResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Transaction history retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of IDRS transactions',
    type: [IdrsTransactionDto],
  })
  data: IdrsTransactionDto[];

  @ApiProperty({
    description: 'Response metadata',
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
 * Token Minting/Burning Data Container
 */
export class TokenMintingDataDto {
  @ApiProperty({
    description: 'Array of minting transactions',
    type: [IdrsTransactionDto],
  })
  mints: IdrsTransactionDto[];

  @ApiProperty({
    description: 'Array of burning transactions',
    type: [IdrsTransactionDto],
  })
  burns: IdrsTransactionDto[];
}

/**
 * Token Minting History Response
 */
export class TokenMintingHistoryResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Token minting history retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Minting and burning data',
    type: TokenMintingDataDto,
  })
  data: TokenMintingDataDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      count: 25,
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata: {
    count: number;
    timestamp: string;
  };
}
