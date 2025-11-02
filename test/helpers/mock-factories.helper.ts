import { User } from '../../src/models/user/user.entity';
import { Wallet } from '../../src/models/wallet/wallet.entity';
import { SmartMeter } from '../../src/models/smartMeter/smartMeter.entity';
import { EnergySettlement } from '../../src/models/energySettlement/energySettlement.entity';
import { MarketTrade } from '../../src/models/marketTrade/marketTrade.entity';
import { TradeOrdersCache } from '../../src/models/tradeOrderCache/tradeOrderCache.entity';
import { TransactionLog } from '../../src/models/transactionLog/transactionLog.entity';
import { IdrsConversion } from '../../src/models/idrsConversion/idrsConversion.entity';
import * as bcrypt from 'bcryptjs';

/**
 * Factory function to create mock User entity
 */
export const createMockUser = async (
  overrides?: Partial<User>,
): Promise<User> => {
  const user = new User();
  user.userId = overrides?.userId || 'test-user-1';
  user.email = overrides?.email || 'test@example.com';
  user.passwordHash =
    overrides?.passwordHash || (await bcrypt.hash('password123', 10));
  user.name = overrides?.name || 'Test User';
  user.primaryWalletAddress =
    overrides?.primaryWalletAddress ||
    '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9';
  user.createdAt = overrides?.createdAt || new Date();
  user.updatedAt = overrides?.updatedAt || new Date();

  return user;
};

/**
 * Factory function to create mock Wallet entity
 */
export const createMockWallet = (overrides?: Partial<Wallet>): Wallet => {
  const wallet = new Wallet();
  wallet.walletAddress =
    overrides?.walletAddress || '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9';
  wallet.userId = overrides?.userId || 'test-user-1';
  wallet.walletName = overrides?.walletName || 'Test Wallet';
  wallet.encryptedPrivateKey =
    overrides?.encryptedPrivateKey || 'encrypted-private-key';
  wallet.importMethod = overrides?.importMethod || 'GENERATED';
  wallet.isActive =
    overrides?.isActive !== undefined ? overrides.isActive : true;
  wallet.createdAt = overrides?.createdAt || new Date();
  wallet.lastUsedAt = overrides?.lastUsedAt || new Date();

  return wallet;
};

/**
 * Factory function to create mock SmartMeter entity
 */
export const createMockSmartMeter = (
  overrides?: Partial<SmartMeter>,
): SmartMeter => {
  const meter = new SmartMeter();
  meter.meterId = overrides?.meterId || 'meter-001';
  meter.userId = overrides?.userId || 'test-user-1';
  meter.location = overrides?.location || 'Test Location';
  meter.status = overrides?.status || 'online';
  meter.meterBlockchainAddress =
    overrides?.meterBlockchainAddress ||
    '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9';
  meter.createdAt = overrides?.createdAt || new Date();
  meter.lastSeen = overrides?.lastSeen || new Date();
  meter.updatedAt = overrides?.updatedAt || new Date();
  meter.firmwareVersion = overrides?.firmwareVersion || '1.0.0';
  meter.deviceModel = overrides?.deviceModel || 'SM-100';
  meter.deviceVersion = overrides?.deviceVersion || '1.0.0';
  meter.capabilities =
    overrides?.capabilities ||
    JSON.stringify({
      hasBattery: true,
      hasSolar: true,
      hasMotor: false,
      hasPWM: true,
    });

  return meter;
};

/**
 * Factory function to create mock EnergySettlement entity
 */
export const createMockEnergySettlement = (
  overrides?: Partial<EnergySettlement>,
): EnergySettlement => {
  const settlement = new EnergySettlement();
  settlement.settlementId = overrides?.settlementId || 1;
  settlement.meterId = overrides?.meterId || 'meter-001';
  settlement.periodStartTime =
    overrides?.periodStartTime || new Date(Date.now() - 5 * 60 * 1000);
  settlement.periodEndTime = overrides?.periodEndTime || new Date();
  settlement.rawExportKwh = overrides?.rawExportKwh || 2.5;
  settlement.rawImportKwh = overrides?.rawImportKwh || 0.5;
  settlement.netKwhFromGrid = overrides?.netKwhFromGrid || 2.0;
  if (overrides?.etkAmountCredited !== undefined) {
    settlement.etkAmountCredited = overrides.etkAmountCredited;
  }
  settlement.settlementTrigger = overrides?.settlementTrigger || 'PERIODIC';
  settlement.status = overrides?.status || 'PENDING';
  if (overrides?.blockchainTxHash !== undefined) {
    settlement.blockchainTxHash = overrides.blockchainTxHash;
  }
  settlement.createdAtBackend = overrides?.createdAtBackend || new Date();
  if (overrides?.confirmedAtOnChain !== undefined) {
    settlement.confirmedAtOnChain = overrides.confirmedAtOnChain;
  }

  return settlement;
};

/**
 * Factory function to create mock TradeOrdersCache entity
 */
export const createMockTradeOrder = (
  overrides?: Partial<TradeOrdersCache>,
): TradeOrdersCache => {
  const order = new TradeOrdersCache();
  order.orderId = overrides?.orderId || 'order-001';
  order.userId = overrides?.userId || 'test-user-1';
  order.walletAddress =
    overrides?.walletAddress || '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9';
  order.orderType = overrides?.orderType || 'ASK';
  order.pair = overrides?.pair || 'ETK/IDRS';
  order.amountEtk = overrides?.amountEtk || 10.0;
  order.priceIdrsPerEtk = overrides?.priceIdrsPerEtk || 1500.0;
  order.totalIdrsValue = overrides?.totalIdrsValue || 15000.0;
  order.statusOnChain = overrides?.statusOnChain || 'OPEN';
  order.createdAtOnChain = overrides?.createdAtOnChain || new Date();
  order.updatedAtCache = overrides?.updatedAtCache || new Date();

  return order;
};

/**
 * Factory function to create mock MarketTrade entity
 */
export const createMockMarketTrade = (
  overrides?: Partial<MarketTrade>,
): MarketTrade => {
  const trade = new MarketTrade();
  trade.tradeId = overrides?.tradeId || 1;
  trade.buyerOrderId = overrides?.buyerOrderId || 'buy-order-001';
  trade.sellerOrderId = overrides?.sellerOrderId || 'sell-order-001';
  trade.buyerProsumerId = overrides?.buyerProsumerId || 'buyer-user-1';
  trade.sellerProsumerId = overrides?.sellerProsumerId || 'seller-user-1';
  trade.buyerWalletAddress =
    overrides?.buyerWalletAddress ||
    '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9';
  trade.sellerWalletAddress =
    overrides?.sellerWalletAddress ||
    '0x8d12A197cB00D4747a1fe03395095ce2A5CC6819';
  trade.tradedEtkAmount = overrides?.tradedEtkAmount || 5.0;
  trade.priceIdrsPerEtk = overrides?.priceIdrsPerEtk || 1500.0;
  trade.totalIdrsValue = overrides?.totalIdrsValue || 7500.0;
  trade.blockchainTxHash = overrides?.blockchainTxHash || '0xabc123def456...';
  trade.tradeTimestamp = overrides?.tradeTimestamp || new Date();
  trade.gasFeeWei = overrides?.gasFeeWei || 3000000;
  trade.createdAt = overrides?.createdAt || new Date();

  return trade;
};

/**
 * Factory function to create mock TransactionLog entity
 */
export const createMockTransactionLog = (
  overrides?: Partial<TransactionLog>,
): TransactionLog => {
  const log = new TransactionLog();
  log.logId = overrides?.logId || 1;
  log.userId = overrides?.userId || 'test-user-1';
  log.relatedOrderId = overrides?.relatedOrderId || 'order-001';
  if (overrides?.relatedSettlementId !== undefined) {
    log.relatedSettlementId = overrides.relatedSettlementId;
  }
  log.transactionType = overrides?.transactionType || 'TRADE_EXECUTION';
  log.description = overrides?.description || 'Test trade execution';
  log.amountPrimary = overrides?.amountPrimary || 5.0;
  log.currencyPrimary = overrides?.currencyPrimary || 'ETK';
  log.amountSecondary = overrides?.amountSecondary || 7500.0;
  log.currencySecondary = overrides?.currencySecondary || 'IDRS';
  log.blockchainTxHash = overrides?.blockchainTxHash || '0xabc123def456...';
  log.transactionTimestamp = overrides?.transactionTimestamp || new Date();

  return log;
};

/**
 * Factory function to create mock IdrsConversion entity
 */
export const createMockIdrsConversion = (
  overrides?: Partial<IdrsConversion>,
): IdrsConversion => {
  const conversion = new IdrsConversion();
  conversion.conversionId = overrides?.conversionId || 1;
  conversion.userId = overrides?.userId || 'test-user-1';
  conversion.walletAddress =
    overrides?.walletAddress || '0x742d35Cc6643C0532925a3b8D0B5a9d5E5b8e8C9';
  conversion.conversionType = overrides?.conversionType || 'ON_RAMP';
  conversion.idrAmount = overrides?.idrAmount || 100000;
  conversion.idrsAmount = overrides?.idrsAmount || 100000;
  conversion.exchangeRate = overrides?.exchangeRate || 1.0;
  conversion.status = overrides?.status || 'SUCCESS';
  conversion.blockchainTxHash =
    overrides?.blockchainTxHash || '0xdef789ghi012...';
  conversion.createdAt = overrides?.createdAt || new Date();
  conversion.confirmedAt = overrides?.confirmedAt || new Date();

  return conversion;
};

/**
 * Create mock sensor data (from MQTT)
 */
export const createMockSensorData = (overrides?: any) => ({
  timestamp: overrides?.timestamp || Date.now(),
  load: {
    power: overrides?.load?.power || 994.8,
    current: overrides?.load?.current || 240.75,
    voltage: overrides?.load?.voltage || 4.1212,
    daily_energy_wh: overrides?.load?.daily_energy_wh || 10.1163,
    total_energy_wh: overrides?.load?.total_energy_wh || 10.1163,
    settlement_energy_wh: overrides?.load?.settlement_energy_wh || 10.1163,
  },
  solar: {
    power: overrides?.solar?.power || 1275.8,
    current: overrides?.solar?.current || 144.47,
    voltage: overrides?.solar?.voltage || 8.813601,
    generating:
      overrides?.solar?.generating !== undefined
        ? overrides.solar.generating
        : true,
    daily_energy_wh: overrides?.solar?.daily_energy_wh || 15.23495,
    total_energy_wh: overrides?.solar?.total_energy_wh || 15.23495,
    settlement_energy_wh: overrides?.solar?.settlement_energy_wh || 15.23495,
  },
  export: {
    power: overrides?.export?.power || 38.6,
    active:
      overrides?.export?.active !== undefined ? overrides.export.active : true,
    current: overrides?.export?.current || 9.51,
    voltage: overrides?.export?.voltage || 4.126,
    daily_energy_wh: overrides?.export?.daily_energy_wh || 1.959955,
    total_energy_wh: overrides?.export?.total_energy_wh || 1.959955,
    settlement_energy_wh: overrides?.export?.settlement_energy_wh || 1.959955,
  },
  import: {
    power: overrides?.import?.power || 0.8,
    active:
      overrides?.import?.active !== undefined ? overrides.import.active : false,
    current: overrides?.import?.current || 0.13,
    voltage: overrides?.import?.voltage || 5.550399,
    daily_energy_wh: overrides?.import?.daily_energy_wh || 0.004,
    total_energy_wh: overrides?.import?.total_energy_wh || 0.004,
    settlement_energy_wh: overrides?.import?.settlement_energy_wh || 0.004,
  },
  battery: {
    power: overrides?.battery?.power || 152.2,
    state: overrides?.battery?.state || 'charging',
    current: overrides?.battery?.current || -36.49,
    voltage: overrides?.battery?.voltage || 4.176,
    daily_energy_wh: overrides?.battery?.daily_energy_wh || 1.793849,
    total_energy_wh: overrides?.battery?.total_energy_wh || 1.793849,
    settlement_energy_wh: overrides?.battery?.settlement_energy_wh || 1.793849,
  },
});

/**
 * Create mock device heartbeat
 */
export const createMockHeartbeat = (overrides?: any) => ({
  qos: overrides?.qos || 2,
  status: overrides?.status || 'alive',
  uptime: overrides?.uptime || 33215145,
  free_heap: overrides?.free_heap || 226024,
  timestamp: overrides?.timestamp || Date.now(),
});

/**
 * Create mock device status
 */
export const createMockDeviceStatus = (overrides?: any) => ({
  timestamp: overrides?.timestamp || Date.now(),
  pwm: {
    max_pwm: overrides?.pwm?.max_pwm || 255,
    led_duty: overrides?.pwm?.led_duty || 63,
  },
  grid: {
    mode: overrides?.grid?.mode || 'export',
    exporting:
      overrides?.grid?.exporting !== undefined
        ? overrides.grid.exporting
        : true,
    importing:
      overrides?.grid?.importing !== undefined
        ? overrides.grid.importing
        : false,
  },
  mqtt: {
    attempts: overrides?.mqtt?.attempts || 0,
    connected:
      overrides?.mqtt?.connected !== undefined
        ? overrides.mqtt.connected
        : true,
  },
  wifi: {
    ip: overrides?.wifi?.ip || '192.168.1.2',
    rssi: overrides?.wifi?.rssi || -60,
    connected:
      overrides?.wifi?.connected !== undefined
        ? overrides.wifi.connected
        : true,
  },
  motor: {
    duty: overrides?.motor?.duty || 0,
    max_pwm: overrides?.motor?.max_pwm || 1023,
    percent: overrides?.motor?.percent || 0,
    direction: overrides?.motor?.direction || 'forward',
  },
  system: {
    free_heap: overrides?.system?.free_heap || 225968,
  },
});

/**
 * Create mock JWT payload
 */
export const createMockJwtPayload = (overrides?: any) => ({
  userId: overrides?.userId || 'test-user-1',
  username: overrides?.username || 'testuser',
  sub: overrides?.sub || 'test-user-1',
  iat: overrides?.iat || Math.floor(Date.now() / 1000),
  exp: overrides?.exp || Math.floor(Date.now() / 1000) + 3600,
});
