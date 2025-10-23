import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsObject,
} from 'class-validator';

export enum GridMode {
  IMPORT = 'import',
  EXPORT = 'export',
  OFF = 'off',
}

export enum EnergyResetScope {
  ALL = 'all',
  BATTERY = 'battery',
  SOLAR = 'solar',
  LOAD = 'load',
}

export class DeviceControlDto {
  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  @IsString()
  @IsNotEmpty()
  meterId: string;

  @ApiProperty({
    description: 'MQTT command to send to device',
    example: {
      grid: 'export',
    },
  })
  @IsObject()
  command: Record<string, any>;
}

export class GridControlDto {
  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  @IsString()
  @IsNotEmpty()
  meterId: string;

  @ApiProperty({
    description: 'Grid mode: import, export, or off',
    enum: GridMode,
    example: 'export',
  })
  @IsEnum(GridMode)
  mode: GridMode;
}

export class EnergyResetDto {
  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  @IsString()
  @IsNotEmpty()
  meterId: string;

  @ApiProperty({
    description: 'Reset scope: all, battery, solar, or load',
    enum: EnergyResetScope,
    example: 'all',
  })
  @IsEnum(EnergyResetScope)
  resetScope: EnergyResetScope;
}

export class DeviceStatusDto {
  @ApiProperty({
    description: 'Device timestamp',
    example: 33860400,
  })
  timestamp: number;

  @ApiProperty({
    description: 'PWM control settings',
    example: {
      max_pwm: 255,
      led_duty: 63,
    },
  })
  pwm: {
    max_pwm: number;
    led_duty: number;
  };

  @ApiProperty({
    description: 'Grid connection status',
    example: {
      mode: 'export',
      exporting: true,
      importing: false,
    },
  })
  grid: {
    mode: string;
    exporting: boolean;
    importing: boolean;
  };

  @ApiProperty({
    description: 'MQTT connection status',
    example: {
      attempts: 0,
      connected: true,
    },
  })
  mqtt: {
    attempts: number;
    connected: boolean;
  };

  @ApiProperty({
    description: 'WiFi connection status',
    example: {
      ip: '192.168.1.2',
      rssi: -60,
      connected: true,
    },
  })
  wifi: {
    ip: string;
    rssi: number;
    connected: boolean;
  };

  @ApiProperty({
    description: 'System metrics',
    example: {
      free_heap: 225968,
    },
  })
  system: {
    free_heap: number;
  };
}

export class CommandResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Command sent successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Command correlation ID',
    example: 'cmd_1234567890',
  })
  correlationId: string;
}
