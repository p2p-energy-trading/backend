// Authentication
export interface AuthenticatedUser {
  user: {
    userId: string;
  };
}

// ==========================================
// API Response Interfaces (Standardized)
// ==========================================

/**
 * Standard API Success Response
 * @template T - Type of data being returned
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  metadata?: ApiResponseMetadata;
}

/**
 * Standard API Error Response
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string | object;
  statusCode?: number;
}

/**
 * Standard API Paginated Response
 * @template T - Type of items in the data array
 */
export interface ApiPaginatedResponse<T = any> {
  success: true;
  data: T[];
  metadata: ApiPaginationMetadata;
  message?: string;
}

/**
 * Metadata for API responses
 */
export interface ApiResponseMetadata {
  timestamp?: string;
  count?: number;
  [key: string]: any; // Allow additional metadata
}

/**
 * Pagination metadata for list endpoints
 */
export interface ApiPaginationMetadata extends ApiResponseMetadata {
  total: number;
  page?: number;
  limit?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = any> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse
  | ApiPaginatedResponse<T>;

// ==========================================
// Configuration Interfaces
// ==========================================

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
  timestamp: number;
  battery: {
    voltage: number;
    current: number;
    power: number;
    daily_energy_wh: number;
    total_energy_wh: number;
    settlement_energy_wh: number;
    state: string;
  };
  load: {
    voltage: number;
    current: number;
    power: number;
    daily_energy_wh: number;
    total_energy_wh: number;
    settlement_energy_wh: number;
  };
  solar: {
    voltage: number;
    current: number;
    power: number;
    daily_energy_wh: number;
    total_energy_wh: number;
    settlement_energy_wh: number;
    generating: boolean;
  };
  import: {
    voltage: number;
    current: number;
    power: number;
    daily_energy_wh: number;
    total_energy_wh: number;
    settlement_energy_wh: number;
    active: boolean;
  };
  export: {
    voltage: number;
    current: number;
    power: number;
    daily_energy_wh: number;
    total_energy_wh: number;
    settlement_energy_wh: number;
    active: boolean;
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
  timestamp: number;
  wifi: {
    connected: boolean;
    rssi: number;
    ip: string;
  };
  motor1: {
    duty: number;
    percent: number;
    direction: string;
  };
  motor2: {
    duty: number;
    percent: number;
    direction: string;
  };
  motor: {
    duty: number;
    percent: number;
    max_pwm: number;
    direction: string;
  };
  pwm: {
    led_duty: number;
    max_pwm: number;
  };
  grid: {
    mode: string;
    importing: boolean;
    exporting: boolean;
  };
  mqtt: {
    connected: boolean;
    attempts: number;
  };
  system: {
    free_heap: number;
  };
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

export interface GridSettlementData {
  meterId: string;
  timestamp: string;
  importEnergyWh: number;
  exportEnergyWh: number;
}
