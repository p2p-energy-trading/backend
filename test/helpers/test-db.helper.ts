import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../../src/models/user/user.entity';
import { Wallet } from '../../src/models/wallet/wallet.entity';
import { SmartMeter } from '../../src/models/smartMeter/smartMeter.entity';
import { EnergySettlement } from '../../src/models/energySettlement/energySettlement.entity';
import { MarketTrade } from '../../src/models/marketTrade/marketTrade.entity';
import { TradeOrdersCache } from '../../src/models/tradeOrderCache/tradeOrderCache.entity';
import { TransactionLog } from '../../src/models/transactionLog/transactionLog.entity';
import { IdrsConversion } from '../../src/models/idrsConversion/idrsConversion.entity';
import { SystemConfig } from '../../src/models/systemConfig/systemConfig.entity';
import { TokenBlacklist } from '../../src/models/tokenBlacklist/tokenBlacklist.entity';
import { TelemetryAggregate } from '../../src/models/telemetryAggregate/telemetryAggregate.entity';

/**
 * Create in-memory SQLite database for testing
 * Fast and isolated for unit/integration tests
 */
export const createTestDatabase = async (): Promise<DataSource> => {
  const options: DataSourceOptions = {
    type: 'sqlite',
    database: ':memory:',
    entities: [
      User,
      Wallet,
      SmartMeter,
      EnergySettlement,
      MarketTrade,
      TradeOrdersCache,
      TransactionLog,
      IdrsConversion,
      SystemConfig,
      TokenBlacklist,
      TelemetryAggregate,
    ],
    synchronize: true,
    dropSchema: true,
    logging: false,
  };

  const dataSource = new DataSource(options);
  await dataSource.initialize();
  return dataSource;
};

/**
 * Clean all tables in the database
 */
export const cleanDatabase = async (dataSource: DataSource): Promise<void> => {
  const entities = dataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.clear();
  }
};

/**
 * Close database connection
 */
export const closeDatabase = async (dataSource: DataSource): Promise<void> => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
};

/**
 * Get TypeORM test configuration for NestJS TestingModule
 */
export const getTestTypeOrmConfig = (): DataSourceOptions => ({
  type: 'sqlite',
  database: ':memory:',
  entities: [
    User,
    Wallet,
    SmartMeter,
    EnergySettlement,
    MarketTrade,
    TradeOrdersCache,
    TransactionLog,
    IdrsConversion,
    SystemConfig,
    TokenBlacklist,
    TelemetryAggregate,
  ],
  synchronize: true,
  dropSchema: true,
  logging: false,
});
