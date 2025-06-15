export interface BlockchainConfig {
  rpcUrl: string;
  chainId: number;
  networkName: string;
  contracts: {
    energyConverter: string;
    market: string;
    etkToken: string;
    idrsToken: string;
  };
}

export interface MqttConfig {
  broker: string;
  port: number;
  username?: string;
  password?: string;
  clientId: string;
  keepalive: number;
  clean: boolean;
}

export interface EnergySettlementConfig {
  intervalMinutes: number;
  autoSettlement: boolean;
  conversionRatio: number; // kWh to ETK ratio
  settlementThreshold: number; // minimum kWh to trigger settlement
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface SensorData {
  timestamp: string;
  export: {
    daily_energy_wh: number;
    total_energy_wh: number;
    settlement_energy_wh: number;
  };
  import: {
    daily_energy_wh: number;
    total_energy_wh: number;
    settlement_energy_wh: number;
  };
  battery: {
    daily_energy_wh: number;
    soc: number;
    power: number;
  };
  solar: {
    daily_energy_wh: number;
    power: number;
  };
  load: {
    daily_energy_wh: number;
    power: number;
  };
}

export interface DeviceHeartbeat {
  timestamp: string;
  uptime_seconds: number;
  free_heap_bytes: number;
  signal_strength: number;
  additional_metrics?: Record<string, any>;
}

export interface DeviceStatus {
  timestamp: string;
  wifi_status: string;
  mqtt_status: string;
  grid_mode: string;
  system_status: string;
  error_codes?: string[];
}

export interface DeviceCommandPayload {
  grid?: 'import' | 'export' | 'off';
  energy?: {
    reset?: 'all' | 'battery' | 'solar' | 'load';
    reset_settlement?: 'all';
  };
  mqtt?: {
    sensor_interval?: number;
  };
  relay?: Record<string, boolean>;
  motor?: Record<string, number>;
  pwm?: Record<string, number>;
}

export interface MarketOrderData {
  orderType: 'BID' | 'ASK';
  quantity: number;
  price: number;
  walletAddress: string;
}

export interface TradeExecutionData {
  buyOrderId: string;
  sellOrderId: string;
  quantity: number;
  price: number;
  buyerAddress: string;
  sellerAddress: string;
}

export interface WalletCreationData {
  walletName: string;
  importMethod: 'GENERATED' | 'IMPORTED_PRIVATE_KEY' | 'IMPORTED_MNEMONIC';
  privateKey?: string;
  mnemonic?: string;
}

export interface IdrsConversionData {
  conversionType: 'ON_RAMP' | 'OFF_RAMP';
  amount: number;
  exchangeRate: number;
}
