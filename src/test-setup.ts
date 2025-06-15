import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

export const createTestingModule = async (
  providers: any[],
  imports: any[] = [],
  controllers: any[] = [],
) => {
  const moduleBuilder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      TypeOrmModule.forRoot({
        type: 'sqlite',
        database: ':memory:',
        entities: ['src/**/*.entity.ts'],
        synchronize: true,
        dropSchema: true,
      }),
      JwtModule.register({
        secret: 'test-secret',
        signOptions: { expiresIn: '1h' },
      }),
      PassportModule,
      ...imports,
    ],
    controllers: [...controllers],
    providers: [...providers],
  });

  return moduleBuilder.compile();
};

export const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
  })),
});

export const createMockUser = () => ({
  prosumerId: 'test-prosumer-1',
  username: 'testuser',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  walletAddress: '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9',
});

export const createMockWallet = () => ({
  walletAddress: '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9',
  prosumerId: 'test-prosumer-1',
  walletName: 'Test Wallet',
  encryptedPrivateKey: 'encrypted-private-key',
  importMethod: 'GENERATED',
  isActive: true,
  createdAt: new Date().toISOString(),
  lastUsedAt: new Date().toISOString(),
});

export const createMockSmartMeter = () => ({
  meterId: 'meter-001',
  meterName: 'Test Smart Meter',
  prosumerId: 'test-prosumer-1',
  location: 'Test Location',
  meterBlockchainAddress: '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9',
  isActive: true,
  installationDate: new Date().toISOString(),
  lastMaintenanceDate: new Date().toISOString(),
});

export const createMockEnergyReading = () => ({
  readingId: 'reading-001',
  meterId: 'meter-001',
  timestamp: new Date(),
  powerKw: 5.5,
  voltageV: 230.0,
  currentA: 24.0,
  frequencyHz: 50.0,
  powerFactorPercent: 95.5,
  energyKwh: 1.5,
  flowDirection: 'EXPORT',
  qualityScore: 100,
  processedAt: new Date(),
});

export const createMockSensorData = () => ({
  timestamp: Date.now(),
  load: {
    power: 994.8,
    current: 240.75,
    voltage: 4.1212,
    daily_energy_wh: 10.1163,
    total_energy_wh: 10.1163,
    settlement_energy_wh: 10.1163,
  },
  solar: {
    power: 1275.8,
    current: 144.47,
    voltage: 8.813601,
    generating: true,
    daily_energy_wh: 15.23495,
    total_energy_wh: 15.23495,
    settlement_energy_wh: 15.23495,
  },
  export: {
    power: 38.6,
    active: true,
    current: 9.51,
    voltage: 4.126,
    daily_energy_wh: 1.959955,
    total_energy_wh: 1.959955,
    settlement_energy_wh: 1.959955,
  },
  import: {
    power: 0.8,
    active: false,
    current: 0.13,
    voltage: 5.550399,
    daily_energy_wh: 0.004,
    total_energy_wh: 0.004,
    settlement_energy_wh: 0.004,
  },
  battery: {
    power: 152.2,
    state: 'charging',
    current: -36.49,
    voltage: 4.176,
    daily_energy_wh: 1.793849,
    total_energy_wh: 1.793849,
    settlement_energy_wh: 1.793849,
  },
});

export const createMockHeartbeat = () => ({
  qos: 2,
  status: 'alive',
  uptime: 33215145,
  free_heap: 226024,
  timestamp: Date.now(),
});

export const createMockDeviceStatus = () => ({
  timestamp: Date.now(),
  pwm: {
    max_pwm: 255,
    led_duty: 63,
  },
  grid: {
    mode: 'export',
    exporting: true,
    importing: false,
  },
  mqtt: {
    attempts: 0,
    connected: true,
  },
  wifi: {
    ip: '192.168.1.2',
    rssi: -60,
    connected: true,
  },
  motor: {
    duty: 0,
    max_pwm: 1023,
    percent: 0,
    direction: 'forward',
  },
  system: {
    free_heap: 225968,
  },
});

export const createMockTradeOrder = () => ({
  orderId: 'order-001',
  prosumerId: 'test-prosumer-1',
  walletAddress: '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9',
  orderType: 'ASK',
  pair: 'ETK/IDRS',
  amountEtk: 10.0,
  priceIdrsPerEtk: 1500.0,
  totalIdrsValue: 15000.0,
  statusOnChain: 'OPEN',
  createdAtOnChain: new Date().toISOString(),
  updatedAtCache: new Date().toISOString(),
});

export const createMockMarketTrade = () => ({
  tradeId: 'trade-001',
  buyOrderId: 'buy-order-001',
  sellOrderId: 'sell-order-001',
  buyerProsumerId: 'buyer-prosumer-1',
  sellerProsumerId: 'seller-prosumer-1',
  buyerWalletAddress: '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9',
  sellerWalletAddress: '0x8d12A197cB00D4747a1fe03395095ce2A5CC6819',
  tradedEtkAmount: 5.0,
  priceIdrsPerEtk: 1500.0,
  totalIdrsValue: 7500.0,
  blockchainTxHash: '0xabc123...',
  tradeTimestamp: new Date().toISOString(),
  createdAt: new Date().toISOString(),
});

export const createMockEnergySettlement = () => ({
  settlementId: 'settlement-001',
  meterId: 'meter-001',
  periodStartTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  periodEndTime: new Date().toISOString(),
  rawExportKwh: 2.5,
  rawImportKwh: 0.5,
  netKwhFromGrid: 2.0,
  settlementTrigger: 'PERIODIC',
  status: 'PENDING',
  blockchainTxHash: '0xdef456...',
  createdAtBackend: new Date().toISOString(),
  confirmedAtOnChain: null,
});

export const mockJwtUser = {
  prosumerId: 'test-prosumer-1',
  username: 'testuser',
  sub: 'test-prosumer-1',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};
