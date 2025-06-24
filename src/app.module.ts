import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { BlockchainApprovalsModule } from './modules/BlockchainApprovals/BlockchainApprovals.module';
import { BlockchainApprovals } from './modules/BlockchainApprovals/entities/BlockchainApprovals.entity';
import { DeviceCommandsModule } from './modules/DeviceCommands/DeviceCommands.module';
import { DeviceCommands } from './modules/DeviceCommands/entities/DeviceCommands.entity';
import { DeviceStatusSnapshotsModule } from './modules/DeviceStatusSnapshots/DeviceStatusSnapshots.module';
import { DeviceStatusSnapshots } from './modules/DeviceStatusSnapshots/entities/DeviceStatusSnapshots.entity';
import { EnergyReadingsDetailedModule } from './modules/EnergyReadingsDetailed/EnergyReadingsDetailed.module';
import { EnergyReadingsDetailed } from './modules/EnergyReadingsDetailed/entities/EnergyReadingsDetailed.entity';
import { EnergySettlementsModule } from './modules/EnergySettlements/EnergySettlements.module';
import { EnergySettlements } from './modules/EnergySettlements/entities/EnergySettlements.entity';
import { IdrsConversionsModule } from './modules/IdrsConversions/IdrsConversions.module';
import { IdrsConversions } from './modules/IdrsConversions/entities/IdrsConversions.entity';
import { MarketTradesModule } from './modules/MarketTrades/MarketTrades.module';
import { MarketTrades } from './modules/MarketTrades/entities/MarketTrades.entity';
import { MqttMessageLogsModule } from './modules/MqttMessageLogs/MqttMessageLogs.module';
import { MqttMessageLogs } from './modules/MqttMessageLogs/entities/MqttMessageLogs.entity';
import { ProsumersModule } from './modules/Prosumers/Prosumers.module';
import { Prosumers } from './modules/Prosumers/entities/Prosumers.entity';
import { SmartMetersModule } from './modules/SmartMeters/SmartMeters.module';
import { SmartMeters } from './modules/SmartMeters/entities/SmartMeters.entity';
import { SystemConfigModule } from './modules/SystemConfig/SystemConfig.module';
import { SystemConfig } from './modules/SystemConfig/entities/SystemConfig.entity';
import { TradeOrdersCacheModule } from './modules/TradeOrdersCache/TradeOrdersCache.module';
import { TradeOrdersCache } from './modules/TradeOrdersCache/entities/TradeOrdersCache.entity';
import { TransactionLogsModule } from './modules/TransactionLogs/TransactionLogs.module';
import { TransactionLogs } from './modules/TransactionLogs/entities/TransactionLogs.entity';
import { WalletsModule } from './modules/Wallets/Wallets.module';
import { Wallets } from './modules/Wallets/entities/Wallets.entity';

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
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    }),
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
  ],
})
export class AppModule {}
