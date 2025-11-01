import { ApiProperty } from '@nestjs/swagger';

/**
 * Dashboard Stats Data (inner data structure)
 */
export class DashboardStatsDto {
  @ApiProperty({
    description: 'Current wallet balances',
    example: {
      etk: '150.5',
      idrs: '500000',
    },
  })
  balances: {
    etk: string;
    idrs: string;
  };

  @ApiProperty({
    description: 'Energy statistics',
    example: {
      totalGenerated: '1250.5',
      totalConsumed: '980.3',
      totalExported: '270.2',
      totalImported: '0',
      netEnergy: '270.2',
    },
  })
  energy: {
    totalGenerated: string;
    totalConsumed: string;
    totalExported: string;
    totalImported: string;
    netEnergy: string;
  };

  @ApiProperty({
    description: 'Trading statistics',
    example: {
      openOrders: 5,
      filledOrders: 23,
      totalTradesVolume: '1500.5',
      totalTradesValue: '2250750',
    },
  })
  trading: {
    openOrders: number;
    filledOrders: number;
    totalTradesVolume: string;
    totalTradesValue: string;
  };

  @ApiProperty({
    description: 'Recent settlements',
    example: [
      {
        settlementId: '123',
        timestamp: '2025-10-23T10:00:00.000Z',
        netEnergyKwh: '10.5',
        etkAmount: '10.5',
        status: 'SUCCESS',
      },
    ],
  })
  recentSettlements: any[];

  @ApiProperty({
    description: 'Device connectivity status',
    example: {
      totalDevices: 3,
      connectedDevices: 2,
      disconnectedDevices: 1,
    },
  })
  devices: {
    totalDevices: number;
    connectedDevices: number;
    disconnectedDevices: number;
  };
}

/**
 * Dashboard Stats Response (with ResponseFormatter wrapper)
 */
export class DashboardStatsResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Statistics retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Dashboard statistics data',
    type: DashboardStatsDto,
    example: {
      balances: {
        etk: '150.5',
        idrs: '500000',
      },
      energy: {
        totalGenerated: '1250.5',
        totalConsumed: '980.3',
        totalExported: '270.2',
        totalImported: '0',
        netEnergy: '270.2',
      },
      trading: {
        openOrders: 5,
        filledOrders: 23,
        totalTradesVolume: '1500.5',
        totalTradesValue: '2250750',
      },
      recentSettlements: [
        {
          settlementId: '123',
          timestamp: '2025-10-23T10:00:00.000Z',
          netEnergyKwh: '10.5',
          etkAmount: '10.5',
          status: 'SUCCESS',
        },
      ],
      devices: {
        totalDevices: 3,
        connectedDevices: 2,
        disconnectedDevices: 1,
      },
    },
  })
  data: DashboardStatsDto;

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

export class EnergyChartDataDto {
  @ApiProperty({
    description: 'Chart labels (dates)',
    example: ['2025-10-17', '2025-10-18', '2025-10-19', '2025-10-20'],
  })
  labels: string[];

  @ApiProperty({
    description: 'Solar generation data',
    example: [15.5, 18.2, 16.8, 17.5],
  })
  solar: number[];

  @ApiProperty({
    description: 'Load consumption data',
    example: [12.3, 13.5, 11.8, 14.2],
  })
  load: number[];

  @ApiProperty({
    description: 'Export to grid data',
    example: [3.2, 4.7, 5.0, 3.3],
  })
  export: number[];

  @ApiProperty({
    description: 'Import from grid data',
    example: [0, 0, 0, 0],
  })
  import: number[];
}

export class RealTimeEnergyDto {
  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  meterId: string;

  @ApiProperty({
    description: 'Current timestamp',
    example: 33857692,
  })
  timestamp: number;

  @ApiProperty({
    description: 'Load data',
    example: {
      power: 994.8,
      current: 240.75,
      voltage: 4.1212,
      daily_energy_wh: 10116.3,
    },
  })
  load: {
    power: number;
    current: number;
    voltage: number;
    daily_energy_wh: number;
  };

  @ApiProperty({
    description: 'Solar data',
    example: {
      power: 1275.8,
      current: 144.47,
      voltage: 8.8136,
      generating: true,
      daily_energy_wh: 15234.95,
    },
  })
  solar: {
    power: number;
    current: number;
    voltage: number;
    generating: boolean;
    daily_energy_wh: number;
  };

  @ApiProperty({
    description: 'Export data',
    example: {
      power: 38.6,
      active: true,
      daily_energy_wh: 1959.955,
    },
  })
  export: {
    power: number;
    active: boolean;
    daily_energy_wh: number;
  };

  @ApiProperty({
    description: 'Import data',
    example: {
      power: 0.8,
      active: false,
      daily_energy_wh: 0.004,
    },
  })
  import: {
    power: number;
    active: boolean;
    daily_energy_wh: number;
  };

  @ApiProperty({
    description: 'Battery data',
    example: {
      power: 152.2,
      state: 'charging',
      current: -36.49,
      voltage: 4.176,
      daily_energy_wh: 1793.849,
    },
  })
  battery: {
    power: number;
    state: string;
    current: number;
    voltage: number;
    daily_energy_wh: number;
  };
}

export class SettlementRecommendationDto {
  @ApiProperty({
    description: 'Smart meter ID',
    example: 'SM001',
  })
  meterId: string;

  @ApiProperty({
    description: 'Should settle now',
    example: true,
  })
  shouldSettle: boolean;

  @ApiProperty({
    description: 'Estimated ETK to mint/burn',
    example: '5.5',
  })
  estimatedEtk: string;

  @ApiProperty({
    description: 'Net energy in kWh',
    example: '5.5',
  })
  netEnergyKwh: string;

  @ApiProperty({
    description: 'Time since last settlement',
    example: '4 minutes 30 seconds',
  })
  timeSinceLastSettlement: string;

  @ApiProperty({
    description: 'Reason for recommendation',
    example: 'Settlement interval reached',
  })
  reason: string;
}

/**
 * Settlement Recommendations Response (with ResponseFormatter wrapper)
 */
export class SettlementRecommendationsResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Settlement recommendations retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of settlement recommendations',
    type: [SettlementRecommendationDto],
    example: [
      {
        meterId: 'SM001',
        shouldSettle: true,
        estimatedEtk: '5.5',
        netEnergyKwh: '5.5',
        timeSinceLastSettlement: '4 minutes 30 seconds',
        reason: 'Settlement interval reached',
      },
      {
        meterId: 'SM002',
        shouldSettle: false,
        estimatedEtk: '0.2',
        netEnergyKwh: '0.2',
        timeSinceLastSettlement: '1 minute 15 seconds',
        reason: 'Below minimum threshold',
      },
    ],
  })
  data: SettlementRecommendationDto[];

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

class BlockchainSyncDataDto {
  @ApiProperty({
    description: 'Whether wallet is connected',
    example: true,
  })
  walletConnected: boolean;

  @ApiProperty({
    description: 'Connected wallet address',
    example: '0xabcd...',
  })
  walletAddress: string;

  @ApiProperty({
    description: 'Number of authorized devices',
    example: 0,
  })
  devicesAuthorized: number;

  @ApiProperty({
    description: 'Total number of devices',
    example: 0,
  })
  totalDevices: number;

  @ApiProperty({
    description: 'Number of pending blockchain transactions',
    example: 0,
  })
  pendingTransactions: number;

  @ApiProperty({
    description: 'Timestamp of last blockchain activity',
    example: '2025-07-19T12:00:00.000Z',
  })
  lastBlockchainActivity: string;

  @ApiProperty({
    description: 'Authorization rate (percentage)',
    example: 0,
  })
  authorizationRate: number;
}

export class BlockchainSyncStatusDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Blockchain sync status retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Blockchain sync status data',
    type: BlockchainSyncDataDto,
    example: {
      walletConnected: true,
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      devicesAuthorized: 2,
      totalDevices: 3,
      pendingTransactions: 1,
      lastBlockchainActivity: '2025-11-01T10:25:00.000Z',
      authorizationRate: 67,
    },
  })
  data: BlockchainSyncDataDto;

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

// System Overview DTOs
export class SystemOverviewEnergyDataDto {
  @ApiProperty({
    description: 'Energy status (surplus or deficit)',
    enum: ['surplus', 'deficit'],
    example: 'surplus',
  })
  status: string;

  @ApiProperty({
    description: 'Energy efficiency percentage',
    example: 85,
  })
  efficiency: number;

  @ApiProperty({
    description: 'Today net energy in kWh',
    example: 10.3,
  })
  todayNet: number;
}

export class SystemOverviewDevicesDataDto {
  @ApiProperty({
    description: 'Device status',
    enum: ['all_online', 'partial_online', 'all_offline'],
    example: 'partial_online',
  })
  status: string;

  @ApiProperty({
    description: 'Device health score percentage',
    example: 67,
  })
  healthScore: number;
}

export class SystemOverviewTradingDataDto {
  @ApiProperty({
    description: 'Trading status',
    enum: ['active', 'inactive'],
    example: 'active',
  })
  status: string;

  @ApiProperty({
    description: 'Profitability status',
    enum: ['profitable', 'loss'],
    example: 'profitable',
  })
  profitability: string;
}

export class SystemOverviewBlockchainDataDto {
  @ApiProperty({
    description: 'Total number of settlements',
    example: 145,
  })
  settlements: number;

  @ApiProperty({
    description: 'Number of pending settlements',
    example: 2,
  })
  pendingSettlements: number;

  @ApiProperty({
    description: 'Blockchain sync status',
    enum: ['synced', 'pending'],
    example: 'pending',
  })
  syncStatus: string;
}

export class SystemOverviewDataDto {
  @ApiProperty({
    description: 'Energy overview',
    type: SystemOverviewEnergyDataDto,
  })
  energy: SystemOverviewEnergyDataDto;

  @ApiProperty({
    description: 'Devices overview',
    type: SystemOverviewDevicesDataDto,
  })
  devices: SystemOverviewDevicesDataDto;

  @ApiProperty({
    description: 'Trading overview',
    type: SystemOverviewTradingDataDto,
  })
  trading: SystemOverviewTradingDataDto;

  @ApiProperty({
    description: 'Blockchain overview',
    type: SystemOverviewBlockchainDataDto,
  })
  blockchain: SystemOverviewBlockchainDataDto;
}

export class SystemOverviewResponseDto {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'System overview retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'System overview data',
    type: SystemOverviewDataDto,
  })
  data: SystemOverviewDataDto;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      timestamp: '2025-10-27T03:45:00.000Z',
    },
  })
  metadata?: {
    timestamp: string;
  };
}
