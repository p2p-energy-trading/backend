import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { BlockchainApprovalsModule } from './graphql/BlockchainApprovals/BlockchainApprovals.module';
import { BlockchainApprovals } from './graphql/BlockchainApprovals/entities/BlockchainApprovals.entity';
import { DeviceCommandsModule } from './graphql/DeviceCommands/DeviceCommands.module';
import { DeviceCommands } from './graphql/DeviceCommands/entities/DeviceCommands.entity';
import { DeviceHeartbeatsModule } from './graphql/DeviceHeartbeats/DeviceHeartbeats.module';
import { DeviceHeartbeats } from './graphql/DeviceHeartbeats/entities/DeviceHeartbeats.entity';
import { DeviceStatusSnapshotsModule } from './graphql/DeviceStatusSnapshots/DeviceStatusSnapshots.module';
import { DeviceStatusSnapshots } from './graphql/DeviceStatusSnapshots/entities/DeviceStatusSnapshots.entity';
import { EnergyReadingsModule } from './graphql/EnergyReadings/EnergyReadings.module';
import { EnergyReadings } from './graphql/EnergyReadings/entities/EnergyReadings.entity';
import { EnergyReadingsDetailedModule } from './graphql/EnergyReadingsDetailed/EnergyReadingsDetailed.module';
import { EnergyReadingsDetailed } from './graphql/EnergyReadingsDetailed/entities/EnergyReadingsDetailed.entity';
import { EnergySettlementsModule } from './graphql/EnergySettlements/EnergySettlements.module';
import { EnergySettlements } from './graphql/EnergySettlements/entities/EnergySettlements.entity';
import { IdrsConversionsModule } from './graphql/IdrsConversions/IdrsConversions.module';
import { IdrsConversions } from './graphql/IdrsConversions/entities/IdrsConversions.entity';
import { MarketTradesModule } from './graphql/MarketTrades/MarketTrades.module';
import { MarketTrades } from './graphql/MarketTrades/entities/MarketTrades.entity';
import { MqttMessageLogsModule } from './graphql/MqttMessageLogs/MqttMessageLogs.module';
import { MqttMessageLogs } from './graphql/MqttMessageLogs/entities/MqttMessageLogs.entity';
import { ProsumersModule } from './graphql/Prosumers/Prosumers.module';
import { Prosumers } from './graphql/Prosumers/entities/Prosumers.entity';
import { SmartMetersModule } from './graphql/SmartMeters/SmartMeters.module';
import { SmartMeters } from './graphql/SmartMeters/entities/SmartMeters.entity';
import { SystemConfigModule } from './graphql/SystemConfig/SystemConfig.module';
import { SystemConfig } from './graphql/SystemConfig/entities/SystemConfig.entity';
import { TradeOrdersCacheModule } from './graphql/TradeOrdersCache/TradeOrdersCache.module';
import { TradeOrdersCache } from './graphql/TradeOrdersCache/entities/TradeOrdersCache.entity';
import { TransactionLogsModule } from './graphql/TransactionLogs/TransactionLogs.module';
import { TransactionLogs } from './graphql/TransactionLogs/entities/TransactionLogs.entity';
import { WalletsModule } from './graphql/Wallets/Wallets.module';
import { Wallets } from './graphql/Wallets/entities/Wallets.entity';

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
        DeviceHeartbeats,
        DeviceStatusSnapshots,
        EnergyReadings,
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
    DeviceHeartbeatsModule,
    DeviceStatusSnapshotsModule,
    EnergyReadingsModule,
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
