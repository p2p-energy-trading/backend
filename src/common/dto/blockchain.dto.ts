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
 * Response DTO for successful IDRS conversion
 */
export class ConvertIDRSResponseDto {
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
