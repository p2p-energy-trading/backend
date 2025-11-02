import { ApiProperty } from '@nestjs/swagger';

// ============================================================================
// DEVICE HEALTH DTOs
// ============================================================================

/**
 * Device Health Summary Data
 */
export class DeviceHealthSummaryDto {
  @ApiProperty({
    description: 'Total number of devices',
    example: 3,
  })
  totalDevices: number;

  @ApiProperty({
    description: 'Number of online devices',
    example: 2,
  })
  onlineDevices: number;

  @ApiProperty({
    description: 'Number of offline devices',
    example: 1,
  })
  offlineDevices: number;

  @ApiProperty({
    description: 'Overall health percentage',
    example: 67,
  })
  healthPercentage: number;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-11-01T10:30:00.000Z',
  })
  lastUpdate: string;
}

/**
 * Device Health Response (with ResponseFormatter wrapper)
 */
export class DeviceHealthResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Device health status retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Device health summary data',
    type: DeviceHealthSummaryDto,
    example: {
      totalDevices: 3,
      onlineDevices: 2,
      offlineDevices: 1,
      healthPercentage: 67,
      lastUpdate: '2025-11-01T10:30:00.000Z',
    },
  })
  data: DeviceHealthSummaryDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata?: {
    timestamp: string;
  };
}

/**
 * Meter Health Details Data
 */
export class MeterHealthDetailsDto {
  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  meterId: string;

  @ApiProperty({
    description: 'Online status',
    example: true,
  })
  isOnline: boolean;

  @ApiProperty({
    description: 'Last seen timestamp',
    example: '2025-11-01T10:29:45.000Z',
  })
  lastSeen: string;

  @ApiProperty({
    description: 'Uptime in seconds',
    example: 3600000,
  })
  uptime: number;

  @ApiProperty({
    description: 'WiFi connection status',
    example: {
      connected: true,
      rssi: -60,
      ip: '192.168.1.100',
    },
  })
  wifi: {
    connected: boolean;
    rssi: number;
    ip: string;
  };

  @ApiProperty({
    description: 'MQTT connection status',
    example: {
      connected: true,
      attempts: 0,
    },
  })
  mqtt: {
    connected: boolean;
    attempts: number;
  };

  @ApiProperty({
    description: 'System health metrics',
    example: {
      freeHeap: 225968,
      status: 'healthy',
    },
  })
  system: {
    freeHeap: number;
    status: string;
  };

  @ApiProperty({
    description: 'Energy flow status',
    example: {
      generating: true,
      exporting: true,
      importing: false,
    },
  })
  energy: {
    generating: boolean;
    exporting: boolean;
    importing: boolean;
  };
}

/**
 * Meter Health Details Response
 */
export class MeterHealthDetailsResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Meter health details retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Meter health details',
    type: MeterHealthDetailsDto,
  })
  data: MeterHealthDetailsDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata?: {
    timestamp: string;
  };
}

/**
 * Device List Item
 */
export class DeviceListItemDto {
  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  meterId: string;

  @ApiProperty({
    description: 'Device location',
    example: 'Rooftop Solar Panel',
  })
  location: string;

  @ApiProperty({
    description: 'Device status',
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
    example: 'ACTIVE',
  })
  status: string;

  @ApiProperty({
    description: 'Online status',
    example: true,
  })
  isOnline: boolean;

  @ApiProperty({
    description: 'Last seen timestamp',
    example: '2025-11-01T10:29:45.000Z',
  })
  lastSeen: string;

  @ApiProperty({
    description: 'Device model',
    example: 'ESP32-Energy-Monitor-v2',
  })
  deviceModel: string;
}

/**
 * Device List Response
 */
export class DeviceListResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Device list retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of devices',
    type: [DeviceListItemDto],
    example: [
      {
        meterId: 'SM001',
        location: 'Rooftop Solar Panel',
        status: 'ACTIVE',
        isOnline: true,
        lastSeen: '2025-11-01T10:29:45.000Z',
        deviceModel: 'ESP32-Energy-Monitor-v2',
      },
      {
        meterId: 'SM002',
        location: 'Garage Solar System',
        status: 'ACTIVE',
        isOnline: false,
        lastSeen: '2025-11-01T09:15:30.000Z',
        deviceModel: 'ESP32-Energy-Monitor-v2',
      },
    ],
  })
  data: DeviceListItemDto[];

  @ApiProperty({
    description: 'Metadata with count',
    example: {
      count: 2,
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata?: {
    count: number;
    timestamp: string;
  };
}

// ============================================================================
// TELEMETRY DTOs
// ============================================================================

/**
 * Telemetry Energy Data
 */
export class TelemetryEnergyDataDto {
  @ApiProperty({
    description: 'Power in Watts',
    example: 994.8,
  })
  power: number;

  @ApiProperty({
    description: 'Current in Amperes',
    example: 240.75,
  })
  current: number;

  @ApiProperty({
    description: 'Voltage in Volts',
    example: 4.1212,
  })
  voltage: number;

  @ApiProperty({
    description: 'Daily energy in Watt-hours',
    example: 10116.3,
  })
  daily_energy_wh: number;
}

/**
 * Latest Telemetry Data
 */
export class LatestTelemetryDataDto {
  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  meterId: string;

  @ApiProperty({
    description: 'Timestamp in milliseconds',
    example: 33857692,
  })
  timestamp: number;

  @ApiProperty({
    description: 'Data type',
    example: 'sensor_data',
  })
  type: string;

  @ApiProperty({
    description: 'Datetime ISO string',
    example: '2025-11-01T10:29:45.000Z',
  })
  datetime: string;

  @ApiProperty({
    description: 'Telemetry data payload',
    example: {
      load: {
        power: 994.8,
        current: 240.75,
        voltage: 4.1212,
        daily_energy_wh: 10116.3,
      },
      solar: {
        power: 1275.8,
        current: 144.47,
        voltage: 8.8136,
        generating: true,
        daily_energy_wh: 15234.95,
      },
      export: {
        power: 38.6,
        active: true,
        daily_energy_wh: 1959.955,
      },
      import: {
        power: 0.8,
        active: false,
        daily_energy_wh: 0.004,
      },
      battery: {
        power: 152.2,
        state: 'charging',
        current: -36.49,
        voltage: 4.176,
        daily_energy_wh: 1793.849,
      },
    },
  })
  data: any;
}

/**
 * Latest Telemetry Data Response
 */
export class LatestTelemetryDataResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Latest meter data retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Latest telemetry data',
    type: LatestTelemetryDataDto,
  })
  data: LatestTelemetryDataDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata?: {
    timestamp: string;
  };
}

/**
 * Latest Telemetry Status
 */
export class LatestTelemetryStatusDto {
  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  meterId: string;

  @ApiProperty({
    description: 'Timestamp in milliseconds',
    example: 33860400,
  })
  timestamp: number;

  @ApiProperty({
    description: 'Status type',
    example: 'device_status',
  })
  type: string;

  @ApiProperty({
    description: 'Datetime ISO string',
    example: '2025-11-01T10:29:50.000Z',
  })
  datetime: string;

  @ApiProperty({
    description: 'Device status data',
    example: {
      wifi: {
        connected: true,
        ip: '192.168.1.2',
        rssi: -60,
      },
      mqtt: {
        connected: true,
        attempts: 0,
      },
      grid: {
        mode: 'export',
        exporting: true,
        importing: false,
      },
      system: {
        free_heap: 225968,
      },
      pwm: {
        max_pwm: 255,
        led_duty: 63,
      },
      motor: {
        duty: 0,
        percent: 0,
        direction: 'forward',
      },
    },
  })
  data: any;
}

/**
 * Latest Telemetry Status Response
 */
export class LatestTelemetryStatusResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Latest meter status retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Latest status data',
    type: LatestTelemetryStatusDto,
  })
  data: LatestTelemetryStatusDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata?: {
    timestamp: string;
  };
}

/**
 * All Latest Telemetry Item
 */
export class AllLatestTelemetryItemDto {
  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  meterId: string;

  @ApiProperty({
    description: 'Latest sensor data',
    type: LatestTelemetryDataDto,
    nullable: true,
  })
  data: LatestTelemetryDataDto | null;

  @ApiProperty({
    description: 'Latest status data',
    type: LatestTelemetryStatusDto,
    nullable: true,
  })
  status: LatestTelemetryStatusDto | null;
}

/**
 * All Latest Telemetry Response
 */
export class AllLatestTelemetryResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'All latest data retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of latest telemetry for all meters',
    type: [AllLatestTelemetryItemDto],
    example: [
      {
        meterId: 'SM001',
        data: {
          meterId: 'SM001',
          timestamp: 33857692,
          type: 'sensor_data',
          datetime: '2025-11-01T10:29:45.000Z',
          data: {
            load: { power: 994.8, current: 240.75 },
            solar: { power: 1275.8, generating: true },
          },
        },
        status: {
          meterId: 'SM001',
          timestamp: 33860400,
          type: 'device_status',
          datetime: '2025-11-01T10:29:50.000Z',
          data: {
            wifi: { connected: true, rssi: -60 },
            mqtt: { connected: true },
          },
        },
      },
    ],
  })
  data: AllLatestTelemetryItemDto[];

  @ApiProperty({
    description: 'Metadata with count',
    example: {
      count: 2,
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata?: {
    count: number;
    timestamp: string;
  };
}

/**
 * Hourly Telemetry Aggregate
 */
export class HourlyTelemetryAggregateDto {
  @ApiProperty({
    description: 'Aggregate ID',
    example: 12345,
  })
  id: number;

  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  meterId: string;

  @ApiProperty({
    description: 'Hour start timestamp',
    example: '2025-11-01T10:00:00.000Z',
  })
  hourStart: string;

  @ApiProperty({
    description: 'Average solar power',
    example: 1250.5,
  })
  avgSolarPower: number;

  @ApiProperty({
    description: 'Average load power',
    example: 980.3,
  })
  avgLoadPower: number;

  @ApiProperty({
    description: 'Average export power',
    example: 270.2,
  })
  avgExportPower: number;

  @ApiProperty({
    description: 'Average import power',
    example: 0,
  })
  avgImportPower: number;

  @ApiProperty({
    description: 'Total energy generated (Wh)',
    example: 1250500,
  })
  totalEnergyGenerated: number;

  @ApiProperty({
    description: 'Total energy consumed (Wh)',
    example: 980300,
  })
  totalEnergyConsumed: number;

  @ApiProperty({
    description: 'Data points count',
    example: 720,
  })
  dataPointsCount: number;
}

/**
 * Telemetry History Response
 */
export class TelemetryHistoryResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Historical data retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of hourly aggregated data',
    type: [HourlyTelemetryAggregateDto],
    example: [
      {
        id: 12345,
        meterId: 'SM001',
        hourStart: '2025-11-01T10:00:00.000Z',
        avgSolarPower: 1250.5,
        avgLoadPower: 980.3,
        avgExportPower: 270.2,
        avgImportPower: 0,
        totalEnergyGenerated: 1250500,
        totalEnergyConsumed: 980300,
        dataPointsCount: 720,
      },
      {
        id: 12346,
        meterId: 'SM001',
        hourStart: '2025-11-01T11:00:00.000Z',
        avgSolarPower: 1380.2,
        avgLoadPower: 1050.8,
        avgExportPower: 329.4,
        avgImportPower: 0,
        totalEnergyGenerated: 1380200,
        totalEnergyConsumed: 1050800,
        dataPointsCount: 720,
      },
    ],
  })
  data: HourlyTelemetryAggregateDto[];

  @ApiProperty({
    description: 'Metadata with count',
    example: {
      count: 24,
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata?: {
    count: number;
    timestamp: string;
  };
}

/**
 * Telemetry History All Meters Item
 */
export class TelemetryHistoryAllMetersItemDto {
  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  meterId: string;

  @ApiProperty({
    description: 'Historical data for this meter',
    type: [HourlyTelemetryAggregateDto],
  })
  data: HourlyTelemetryAggregateDto[];
}

/**
 * Telemetry History All Meters Response
 */
export class TelemetryHistoryAllMetersResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Historical data for all meters retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of meter histories',
    type: [TelemetryHistoryAllMetersItemDto],
    example: [
      {
        meterId: 'SM001',
        data: [
          {
            id: 12345,
            meterId: 'SM001',
            hourStart: '2025-11-01T10:00:00.000Z',
            avgSolarPower: 1250.5,
            avgLoadPower: 980.3,
          },
        ],
      },
      {
        meterId: 'SM002',
        data: [
          {
            id: 12347,
            meterId: 'SM002',
            hourStart: '2025-11-01T10:00:00.000Z',
            avgSolarPower: 950.2,
            avgLoadPower: 780.5,
          },
        ],
      },
    ],
  })
  data: TelemetryHistoryAllMetersItemDto[];

  @ApiProperty({
    description: 'Metadata with count',
    example: {
      count: 2,
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata?: {
    count: number;
    timestamp: string;
  };
}

/**
 * Archive Statistics
 */
export class ArchiveStatsDto {
  @ApiProperty({
    description: 'Total archived records',
    example: 156432,
  })
  totalArchivedRecords: number;

  @ApiProperty({
    description: 'Oldest archived date',
    example: '2025-01-01T00:00:00.000Z',
  })
  oldestArchivedDate: string;

  @ApiProperty({
    description: 'Latest archived date',
    example: '2025-10-31T23:59:59.000Z',
  })
  latestArchivedDate: string;

  @ApiProperty({
    description: 'Archive size in MB',
    example: 2456.78,
  })
  archiveSizeMB: number;

  @ApiProperty({
    description: 'Number of archived meters',
    example: 15,
  })
  archivedMetersCount: number;
}

/**
 * Archive Statistics Response
 */
export class ArchiveStatsResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Archive stats retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Archive statistics',
    type: ArchiveStatsDto,
    example: {
      totalArchivedRecords: 156432,
      oldestArchivedDate: '2025-01-01T00:00:00.000Z',
      latestArchivedDate: '2025-10-31T23:59:59.000Z',
      archiveSizeMB: 2456.78,
      archivedMetersCount: 15,
    },
  })
  data: ArchiveStatsDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata?: {
    timestamp: string;
  };
}

/**
 * Telemetry System Health
 */
export class TelemetrySystemHealthDto {
  @ApiProperty({
    description: 'Redis health status',
    enum: ['healthy', 'unhealthy'],
    example: 'healthy',
  })
  redis: string;

  @ApiProperty({
    description: 'Health check timestamp',
    example: '2025-11-01T10:30:00.000Z',
  })
  timestamp: string;
}

/**
 * Telemetry System Health Response
 */
export class TelemetrySystemHealthResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Telemetry system health check completed',
  })
  message: string;

  @ApiProperty({
    description: 'System health status',
    type: TelemetrySystemHealthDto,
    example: {
      redis: 'healthy',
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  data: TelemetrySystemHealthDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-11-01T10:30:00.000Z',
    },
  })
  metadata?: {
    timestamp: string;
  };
}
