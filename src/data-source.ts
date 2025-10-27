import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import { FirstSeeder } from './database/seeders/FirstSeeder';
import { ProsumersFactory } from './database/factories/ProsumersFactory';
import { WalletsFactory } from './database/factories/WalletsFactory';
import { SmartMetersFactory } from './database/factories/SmartMetersFactory';
import { Prosumers } from './models/user/user.entity';
// Removed: BlockchainApprovals (not used)
import { EnergySettlements } from './models/energySettlement/energySettlement.entity';
import { IdrsConversions } from './models/idrsConversion/idrsConversion.entity';
import { MarketTrades } from './models/marketTrade/marketTrade.entity';
import { SmartMeters } from './models/smartMeter/SmartMeters.entity';
import { SystemConfig } from './models/systemConfig/SystemConfig.entity';
// Removed: TelemetryData (replaced by Redis)
import { TokenBlacklist } from './models/tokenBlacklist/TokenBlacklist.entity';
import { TradeOrdersCache } from './models/tradeOrdersCache/TradeOrdersCache.entity';
import { TransactionLogs } from './models/transactionLog/TransactionLogs.entity';
import { Wallets } from './models/wallet/Wallets.entity';
import { TelemetryAggregate } from './models/telemetryAggregate/TelemetryAggregate.entity';

// Base TypeORM DataSource configuration
const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  synchronize: false,
  entities: [
    Prosumers,
    // Removed entities (not used or replaced by Redis):
    // - BlockchainApprovals (not used)
    // - DeviceCommands (replaced by Redis)
    // - DeviceStatusSnapshots (replaced by Redis)
    // - EnergyReadingsDetailed (replaced by Redis)
    // - MqttMessageLogs (replaced by Redis)
    EnergySettlements,
    IdrsConversions,
    MarketTrades,
    SmartMeters,
    SystemConfig,
    // Removed: TelemetryData (replaced by Redis)
    TokenBlacklist,
    TradeOrdersCache,
    TransactionLogs,
    Wallets,
    TelemetryAggregate,
  ],
  migrations: ['src/database/migrations/*.ts'],
};

// Extend with seeder options for typeorm-extension
export const seederOptions: DataSourceOptions & SeederOptions = {
  ...dataSourceOptions,
  seeds: [FirstSeeder],
  factories: [ProsumersFactory, WalletsFactory, SmartMetersFactory],
};

// Export DataSource for TypeORM
export const AppDataSource = new DataSource(dataSourceOptions);
