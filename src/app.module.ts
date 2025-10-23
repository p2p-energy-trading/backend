import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { BlockchainApprovalsModule } from './models/BlockchainApprovals/BlockchainApprovals.module';
import { BlockchainApprovals } from './models/BlockchainApprovals/BlockchainApprovals.entity';
import { DeviceCommandsModule } from './models/DeviceCommands/DeviceCommands.module';
import { DeviceCommands } from './models/DeviceCommands/DeviceCommands.entity';
import { DeviceStatusSnapshotsModule } from './models/DeviceStatusSnapshots/DeviceStatusSnapshots.module';
import { DeviceStatusSnapshots } from './models/DeviceStatusSnapshots/DeviceStatusSnapshots.entity';
import { EnergyReadingsDetailedModule } from './models/EnergyReadingsDetailed/EnergyReadingsDetailed.module';
import { EnergyReadingsDetailed } from './models/EnergyReadingsDetailed/EnergyReadingsDetailed.entity';
import { EnergySettlementsModule } from './models/EnergySettlements/EnergySettlements.module';
import { EnergySettlements } from './models/EnergySettlements/EnergySettlements.entity';
import { IdrsConversionsModule } from './models/IdrsConversions/IdrsConversions.module';
import { IdrsConversions } from './models/IdrsConversions/IdrsConversions.entity';
import { MarketTradesModule } from './models/MarketTrades/MarketTrades.module';
import { MarketTrades } from './models/MarketTrades/MarketTrades.entity';
import { MqttMessageLogsModule } from './models/MqttMessageLogs/MqttMessageLogs.module';
import { MqttMessageLogs } from './models/MqttMessageLogs/MqttMessageLogs.entity';
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
        BlockchainApprovals,
        DeviceCommands,
        DeviceStatusSnapshots,
        EnergyReadingsDetailed,
        EnergySettlements,
        IdrsConversions,
        MarketTrades,
        MqttMessageLogs,
        Prosumers,
        SmartMeters,
        SystemConfig,
        TradeOrdersCache,
        TransactionLogs,
        Wallets,
        TokenBlacklist,
      ],
      // synchronize: true,
    }),
    BlockchainApprovalsModule,
    DeviceCommandsModule,
    DeviceStatusSnapshotsModule,
    EnergyReadingsDetailedModule,
    EnergySettlementsModule,
    IdrsConversionsModule,
    MarketTradesModule,
    MqttMessageLogsModule,
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
  ],
})
export class AppModule {}
