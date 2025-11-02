import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateSmartMeterDto {
  @ApiProperty({
    description: 'Unique smart meter ID',
    example: 'SM001',
  })
  @IsString()
  @IsNotEmpty()
  meterId: string;

  @ApiProperty({
    description: 'Physical location of the smart meter',
    example: 'Rooftop - Building A',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'Blockchain address associated with the meter',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    required: false,
  })
  @IsString()
  @IsOptional()
  meterBlockchainAddress?: string;

  @ApiProperty({
    description: 'Device model name',
    example: 'EnerLink Smart Meter v2',
    required: false,
  })
  @IsString()
  @IsOptional()
  deviceModel?: string;

  @ApiProperty({
    description: 'Device firmware version',
    example: '2.1.0',
    required: false,
  })
  @IsString()
  @IsOptional()
  deviceVersion?: string;

  @ApiProperty({
    description: 'Device capabilities (battery, solar, motor, etc.)',
    example: {
      hasBattery: true,
      hasSolar: true,
      hasMotor: false,
      hasPWM: true,
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  capabilities?: any;
}

/**
 * Smart meter data (inside ResponseFormatter wrapper)
 */
export class SmartMeterDataDto {
  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  meterId: string;

  @ApiProperty({
    description: 'Owner user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Location',
    example: 'Rooftop - Building A',
  })
  location: string;

  @ApiProperty({
    description: 'Device status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
  })
  status: string;

  @ApiProperty({
    description: 'Device model',
    example: 'EnerLink Smart Meter v2',
  })
  deviceModel: string;

  @ApiProperty({
    description: 'Firmware version',
    example: '2.1.0',
  })
  firmwareVersion: string;

  @ApiProperty({
    description: 'Settlement interval in minutes',
    example: 5,
  })
  settlementIntervalMinutes: number;

  @ApiProperty({
    description: 'Last seen timestamp',
    example: '2025-10-23T10:30:00.000Z',
    nullable: true,
  })
  lastSeen: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-10-22T08:00:00.000Z',
  })
  createdAt: string;
}

/**
 * Smart meter response with ResponseFormatter wrapper
 */
export class SmartMeterResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Smart meter created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Smart meter data',
    type: SmartMeterDataDto,
  })
  data: SmartMeterDataDto;

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

export class LinkSmartMeterDto {
  @ApiProperty({
    description: 'Smart meter ID to link',
    example: 'SM001',
  })
  @IsString()
  @IsNotEmpty()
  meterId: string;
}

export class UnlinkSmartMeterDto {
  @ApiProperty({
    description: 'Smart meter ID to unlink',
    example: 'SM001',
  })
  @IsString()
  @IsNotEmpty()
  meterId: string;
}

export class UpdateSettlementIntervalDto {
  @ApiProperty({
    description: 'Settlement interval in minutes',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  intervalMinutes: number;
}

/**
 * DTO for device control commands
 */
export class DeviceControlDto {
  @ApiProperty({
    description: 'Smart meter device ID',
    example: 'SM001',
  })
  @IsString()
  @IsNotEmpty({ message: 'Meter ID is required' })
  meterId: string;

  @ApiProperty({
    description: 'MQTT command object to send to device',
    example: { relay: { state: 'on' } },
  })
  @IsObject()
  @IsNotEmpty({ message: 'Command is required' })
  command: any;
}

/**
 * DTO for grid control commands
 */
export class GridControlDto {
  @ApiProperty({
    description: 'Smart meter device ID',
    example: 'SM001',
  })
  @IsString()
  @IsNotEmpty({ message: 'Meter ID is required' })
  meterId: string;

  @ApiProperty({
    description: 'Grid operation mode',
    enum: ['import', 'export', 'off'],
    example: 'export',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mode is required' })
  mode: 'import' | 'export' | 'off';
}

/**
 * DTO for energy reset commands
 */
export class EnergyResetDto {
  @ApiProperty({
    description: 'Smart meter device ID',
    example: 'SM001',
  })
  @IsString()
  @IsNotEmpty({ message: 'Meter ID is required' })
  meterId: string;

  @ApiProperty({
    description: 'Reset type',
    enum: ['all', 'battery', 'solar', 'load', 'grid'],
    example: 'all',
  })
  @IsString()
  @IsNotEmpty({ message: 'Reset type is required' })
  resetType: 'all' | 'battery' | 'solar' | 'load' | 'grid';
}
