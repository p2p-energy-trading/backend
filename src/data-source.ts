import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import { FirstSeeder } from './database/seeders/FirstSeeder';
import { ProsumersFactory } from './database/factories/ProsumersFactory';
import { WalletsFactory } from './database/factories/WalletsFactory';
import { SmartMetersFactory } from './database/factories/SmartMetersFactory';
import { Prosumers } from './models/prosumer/Prosumers.entity';
// Removed: BlockchainApprovals (not used)
import { EnergySettlements } from './models/energySettlement/EnergySettlements.entity';
import { IdrsConversions } from './models/idrsConversion/IdrsConversions.entity';
import { MarketTrades } from './models/marketTrade/MarketTrades.entity';
import { SmartMeters } from './models/SmartMeters/SmartMeters.entity';
import { SystemConfig } from './models/SystemConfig/SystemConfig.entity';
// Removed: TelemetryData (replaced by Redis)
import { TokenBlacklist } from './models/TokenBlacklist/TokenBlacklist.entity';
import { TradeOrdersCache } from './models/TradeOrdersCache/TradeOrdersCache.entity';
import { TransactionLogs } from './models/TransactionLogs/TransactionLogs.entity';
import { Wallets } from './models/Wallets/Wallets.entity';
import { TelemetryAggregate } from './models/TelemetryAggregate/TelemetryAggregate.entity';

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
