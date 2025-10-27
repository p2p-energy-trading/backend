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
import { EnergySettlementsModule } from './models/EnergySettlements/EnergySettlements.module';
import { EnergySettlements } from './models/EnergySettlements/EnergySettlements.entity';
import { IdrsConversionsModule } from './models/IdrsConversions/IdrsConversions.module';
import { IdrsConversions } from './models/IdrsConversions/IdrsConversions.entity';
import { MarketTradesModule } from './models/MarketTrades/MarketTrades.module';
import { MarketTrades } from './models/MarketTrades/MarketTrades.entity';
import { ProsumersModule } from './models/Prosumers/Prosumers.module';
import { Prosumers } from './models/Prosumers/Prosumers.entity';
import { SmartMetersModule } from './models/SmartMeters/SmartMeters.module';
import { SmartMeters } from './models/SmartMeters/SmartMeters.entity';
import { SystemConfigModule } from './models/SystemConfig/SystemConfig.module';
import { SystemConfig } from './models/SystemConfig/SystemConfig.entity';
import { TradeOrdersCacheModule } from './models/TradeOrdersCache/TradeOrdersCache.module';
import { TradeOrdersCache } from './models/TradeOrdersCache/TradeOrdersCache.entity';
import { TransactionLogsModule } from './models/TransactionLogs/TransactionLogs.module';
import { TransactionLogs } from './models/TransactionLogs/TransactionLogs.entity';
import { WalletsModule } from './models/Wallets/Wallets.module';
import { Wallets } from './models/Wallets/Wallets.entity';
import { TokenBlacklistModule } from './models/TokenBlacklist/TokenBlacklist.module';
import { TokenBlacklist } from './models/TokenBlacklist/TokenBlacklist.entity';

// Import new modules
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { ServicesModule } from './services/services.module';
import { ControllersModule } from './controllers/controllers.module';
import { WebSocketModule } from './websocket/websocket.module';
// Removed: TelemetryDataModule (replaced by Redis)
import { TelemetryAggregate } from './models/TelemetryAggregate/TelemetryAggregate.entity';

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
