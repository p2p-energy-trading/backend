import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import { UserSeeder } from './database/seeders/UserSeeder';
import { UserFactory } from './database/factories/UserFactory';
import { Prosumers } from './models/Prosumers/Prosumers.entity';
import { BlockchainApprovals } from './models/BlockchainApprovals/BlockchainApprovals.entity';
import { DeviceCommands } from './models/DeviceCommands/DeviceCommands.entity';
import { DeviceStatusSnapshots } from './models/DeviceStatusSnapshots/DeviceStatusSnapshots.entity';
import { EnergyReadingsDetailed } from './models/EnergyReadingsDetailed/EnergyReadingsDetailed.entity';
import { EnergySettlements } from './models/EnergySettlements/EnergySettlements.entity';
import { IdrsConversions } from './models/IdrsConversions/IdrsConversions.entity';
import { MarketTrades } from './models/MarketTrades/MarketTrades.entity';
import { MqttMessageLogs } from './models/MqttMessageLogs/MqttMessageLogs.entity';
import { SmartMeters } from './models/SmartMeters/SmartMeters.entity';
import { SystemConfig } from './models/SystemConfig/SystemConfig.entity';
import { TelemetryData } from './models/TelemetryData/TelemetryData.entity';
import { TokenBlacklist } from './models/TokenBlacklist/TokenBlacklist.entity';
import { TradeOrdersCache } from './models/TradeOrdersCache/TradeOrdersCache.entity';
import { TransactionLogs } from './models/TransactionLogs/TransactionLogs.entity';
import { Wallets } from './models/Wallets/Wallets.entity';

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
    BlockchainApprovals,
    DeviceCommands,
    DeviceStatusSnapshots,
    EnergyReadingsDetailed,
    EnergySettlements,
    IdrsConversions,
    MarketTrades,
    MqttMessageLogs,
    SmartMeters,
    SystemConfig,
    TelemetryData,
    TokenBlacklist,
    TradeOrdersCache,
    TransactionLogs,
    Wallets,
  ],
  migrations: ['src/database/migrations/*.ts'],
};

// Extend with seeder options for typeorm-extension
export const seederOptions: DataSourceOptions & SeederOptions = {
  ...dataSourceOptions,
  seeds: [UserSeeder],
  factories: [UserFactory],
};

// Export DataSource for TypeORM
export const AppDataSource = new DataSource(dataSourceOptions);
