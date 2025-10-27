import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

// Removed unused modules (replaced by Redis and TimescaleDB):
// - BlockchainApprovals (not used)
// - DeviceCommands
// - DeviceStatusSnapshots
// - EnergyReadingsDetailed
// - MqttMessageLogs
import { EnergySettlementsModule } from './models/energySettlement/energySettlement.module';
import { EnergySettlements } from './models/energySettlement/energySettlement.entity';
import { IdrsConversionsModule } from './models/idrsConversion/idrsConversion.module';
import { IdrsConversions } from './models/idrsConversion/idrsConversion.entity';
import { MarketTradesModule } from './models/marketTrade/marketTrade.module';
import { MarketTrades } from './models/marketTrade/marketTrade.entity';
import { ProsumersModule } from './models/user/user.module';
import { Prosumers } from './models/user/user.entity';
import { SmartMetersModule } from './models/smartMeter/SmartMeters.module';
import { SmartMeters } from './models/smartMeter/SmartMeters.entity';
import { SystemConfigModule } from './models/systemConfig/SystemConfig.module';
import { SystemConfig } from './models/systemConfig/SystemConfig.entity';
import { TradeOrdersCacheModule } from './models/tradeOrdersCache/TradeOrdersCache.module';
import { TradeOrdersCache } from './models/tradeOrdersCache/TradeOrdersCache.entity';
import { TransactionLogsModule } from './models/transactionLog/TransactionLogs.module';
import { TransactionLogs } from './models/transactionLog/TransactionLogs.entity';
import { WalletsModule } from './models/wallet/Wallets.module';
import { Wallets } from './models/wallet/Wallets.entity';
import { TokenBlacklistModule } from './models/tokenBlacklist/TokenBlacklist.module';
import { TokenBlacklist } from './models/tokenBlacklist/TokenBlacklist.entity';

// Import new modules
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { ServicesModule } from './services/services.module';
import { ControllersModule } from './controllers/controllers.module';
import { WebSocketModule } from './websocket/websocket.module';
// Removed: TelemetryDataModule (replaced by Redis)
import { TelemetryAggregate } from './models/telemetryAggregate/TelemetryAggregate.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'dev2',
      schema: process.env.DB_SCHEMA || 'public',
      entities: [
        // Removed: BlockchainApprovals (not used), DeviceCommands, DeviceStatusSnapshots, EnergyReadingsDetailed, MqttMessageLogs, TelemetryData (replaced by Redis)
        EnergySettlements,
        IdrsConversions,
        MarketTrades,
        Prosumers,
        SmartMeters,
        SystemConfig,
        TradeOrdersCache,
        TransactionLogs,
        Wallets,
        TokenBlacklist,
        TelemetryAggregate,
      ],
      // synchronize: true,
    }),
    // Removed: BlockchainApprovalsModule, DeviceCommandsModule, DeviceStatusSnapshotsModule, EnergyReadingsDetailedModule, MqttMessageLogsModule
    EnergySettlementsModule,
    IdrsConversionsModule,
    MarketTradesModule,
    ProsumersModule,
    SmartMetersModule,
    SystemConfigModule,
    TradeOrdersCacheModule,
    TransactionLogsModule,
    WalletsModule,
    AuthModule,
    CommonModule,
    ServicesModule,
    ControllersModule,
    WebSocketModule,
    TokenBlacklistModule,
    // Removed: TelemetryDataModule (replaced by Redis)
  ],
})
export class AppModule {}
