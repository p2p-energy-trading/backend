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

/**
 * Command response data (inside ResponseFormatter wrapper)
 */
export class CommandDataDto {
  @ApiProperty({
    description: 'Command correlation ID for tracking',
    example: 'cmd_1234567890',
  })
  correlationId: string;

  @ApiProperty({
    description: 'Command details',
    example: {
      meterId: 'SM001',
      command: { grid: 'export' },
    },
    required: false,
  })
  @IsOptional()
  details?: Record<string, any>;
}

/**
 * Command response with ResponseFormatter wrapper
 */
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
    description: 'Command data',
    type: CommandDataDto,
  })
  data: CommandDataDto;

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

export class DeviceHeartbeatDto {
  @ApiProperty({
    description: 'Last update timestamp (ISO 8601)',
    example: '2025-10-26T10:30:15.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Device status: alive or offline',
    example: 'alive',
  })
  status: string;

  @ApiProperty({
    description: 'Time since last update',
    example: '5s',
    required: false,
  })
  @IsOptional()
  timeSinceLastUpdate?: string;

  @ApiProperty({
    description: 'Data source',
    example: 'redis_telemetry',
  })
  source: string;
}

/**
 * Device status data (inside ResponseFormatter wrapper)
 */
export class DeviceStatusDataDto {
  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  meterId: string;

  @ApiProperty({
    description: 'Last heartbeat information',
    type: DeviceHeartbeatDto,
    nullable: true,
  })
  lastHeartbeat: DeviceHeartbeatDto | null;

  @ApiProperty({
    description: 'Last device status snapshot',
    example: {
      wifi: {
        connected: true,
        rssi: -60,
        ip: '192.168.1.2',
      },
      grid: {
        mode: 'export',
        importing: false,
        exporting: true,
      },
      mqtt: {
        connected: true,
        attempts: 0,
        qos: 2,
      },
      system: {
        free_heap: 225968,
        uptime: 33860400,
        status: 'alive',
      },
      timestamp: '2025-11-01T10:30:00.000Z',
    },
    nullable: true,
  })
  lastStatus: {
    wifi: {
      connected: boolean;
      rssi: number;
      ip: string;
    };
    grid: {
      mode: string;
      importing: boolean;
      exporting: boolean;
    };
    mqtt: {
      connected: boolean;
      attempts: number;
      qos: number;
    };
    system: {
      free_heap: number;
      uptime: number;
      status: string;
    };
    timestamp: string;
  } | null;

  @ApiProperty({
    description: 'Last telemetry data',
    example: {
      battery: { power: 152.2, state: 'charging' },
      export: { power: 38.6, active: true },
      import: { power: 0.8, active: false },
      solar: { power: 1275.8, generating: true },
      load: { power: 994.8 },
      timestamp: '2025-11-01T10:30:00.000Z',
    },
    nullable: true,
  })
  lastData: {
    battery: any;
    export: any;
    import: any;
    solar: any;
    load: any;
    timestamp: string;
  } | null;

  @ApiProperty({
    description: 'Whether device is currently online',
    example: true,
  })
  isOnline: boolean;

  @ApiProperty({
    description: 'Heartbeat threshold duration',
    example: '2 minutes',
  })
  heartbeatThreshold: string;
}

/**
 * Device status response with ResponseFormatter wrapper
 */
export class DeviceStatusResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Device status retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Device status data',
    type: DeviceStatusDataDto,
  })
  data: DeviceStatusDataDto;

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
