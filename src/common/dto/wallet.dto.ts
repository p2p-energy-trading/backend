import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export enum ImportMethod {
  GENERATED = 'GENERATED',
  IMPORTED_PRIVATE_KEY = 'IMPORTED_PRIVATE_KEY',
  IMPORTED_MNEMONIC = 'IMPORTED_MNEMONIC',
}

export enum ConversionTypeEnum {
  ON_RAMP = 'ON_RAMP',
  OFF_RAMP = 'OFF_RAMP',
}

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
    enum: ImportMethod,
    example: 'GENERATED',
  })
  @IsEnum(ImportMethod)
  importMethod: ImportMethod;

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

export class CreateWalletResponseDto {
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

  @ApiProperty({
    description: 'Success message',
    example: 'Wallet created successfully',
  })
  message: string;
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
    enum: ConversionTypeEnum,
    example: 'ON_RAMP',
  })
  @IsEnum(ConversionTypeEnum)
  conversionType: ConversionTypeEnum;

  @ApiProperty({
    description: 'Amount to convert',
    example: 100000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class IdrsConversionResponseDto {
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

  @ApiProperty({
    description: 'Success message',
    example:
      'ON_RAMP conversion successful. 100000 IDRS tokens have been minted.',
  })
  message: string;
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
  isPrimary: boolean;

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
}
