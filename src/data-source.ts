import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import { FirstSeeder } from './database/seeders/FirstSeeder';
import { UsersFactory } from './database/factories/UsersFactory';
import { WalletsFactory } from './database/factories/WalletsFactory';
import { SmartMetersFactory } from './database/factories/SmartMetersFactory';
import { User } from './models/user/user.entity';
// Removed: BlockchainApprovals (not used)
import { EnergySettlement } from './models/energySettlement/energySettlement.entity';
import { IdrsConversion } from './models/idrsConversion/idrsConversion.entity';
import { MarketTrade } from './models/marketTrade/marketTrade.entity';
import { SmartMeter } from './models/smartMeter/smartMeter.entity';
import { SystemConfig } from './models/systemConfig/systemConfig.entity';
// Removed: TelemetryData (replaced by Redis)
import { TokenBlacklist } from './models/tokenBlacklist/tokenBlacklist.entity';
// Removed: TradeOrdersCache (replaced by Redis)
import { TransactionLog } from './models/transactionLog/transactionLog.entity';
import { Wallet } from './models/wallet/wallet.entity';
import { TelemetryAggregate } from './models/telemetryAggregate/telemetryAggregate.entity';

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
    User,
    // Removed entities (not used or replaced by Redis):
    // - BlockchainApprovals (not used)
    // - DeviceCommands (replaced by Redis)
    // - DeviceStatusSnapshots (replaced by Redis)
    // - EnergyReadingsDetailed (replaced by Redis)
    // - MqttMessageLogs (replaced by Redis)
    EnergySettlement,
    IdrsConversion,
    MarketTrade,
    SmartMeter,
    SystemConfig,
    // Removed: TelemetryData (replaced by Redis)
    TokenBlacklist,
    // Removed: TradeOrdersCache (replaced by Redis)
    TransactionLog,
    Wallet,
    TelemetryAggregate,
  ],
  migrations: ['src/database/migrations/*.ts'],
};

// Extend with seeder options for typeorm-extension
export const seederOptions: DataSourceOptions & SeederOptions = {
  ...dataSourceOptions,
  seeds: [FirstSeeder],
  factories: [UsersFactory, WalletsFactory, SmartMetersFactory],
};

// Export DataSource for TypeORM
export const AppDataSource = new DataSource(dataSourceOptions);
