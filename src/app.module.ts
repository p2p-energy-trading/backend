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
// - TradeOrdersCache (replaced by Redis via TradeOrdersCacheRedisService)
import { EnergySettlementsModule } from './models/energySettlement/energySettlement.module';
import { EnergySettlement } from './models/energySettlement/energySettlement.entity';
import { IdrsConversionsModule } from './models/idrsConversion/idrsConversion.module';
import { IdrsConversion } from './models/idrsConversion/idrsConversion.entity';
import { MarketTradesModule } from './models/marketTrade/marketTrade.module';
import { MarketTrade } from './models/marketTrade/marketTrade.entity';
import { UsersModule } from './models/user/user.module';
import { User } from './models/user/user.entity';
import { SmartMetersModule } from './models/smartMeter/smartMeter.module';
import { SmartMeter } from './models/smartMeter/smartMeter.entity';
import { SystemConfigModule } from './models/systemConfig/systemConfig.module';
import { SystemConfig } from './models/systemConfig/systemConfig.entity';
import { TransactionLogsModule } from './models/transactionLog/transactionLog.module';
import { TransactionLog } from './models/transactionLog/transactionLog.entity';
import { WalletsModule } from './models/wallet/wallet.module';
import { Wallet } from './models/wallet/wallet.entity';
import { TokenBlacklistModule } from './models/tokenBlacklist/tokenBlacklist.module';
import { TokenBlacklist } from './models/tokenBlacklist/tokenBlacklist.entity';

// Import new modules
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { ServicesModule } from './services/services.module';
import { ControllersModule } from './controllers/controllers.module';
import { WebSocketModule } from './websocket/websocket.module';
// Removed: TelemetryDataModule (replaced by Redis)
import { TelemetryAggregate } from './models/telemetryAggregate/telemetryAggregate.entity';

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
        // Removed: BlockchainApprovals (not used), DeviceCommands, DeviceStatusSnapshots, EnergyReadingsDetailed, MqttMessageLogs, TelemetryData (replaced by Redis), TradeOrdersCache (replaced by Redis)
        EnergySettlement,
        IdrsConversion,
        MarketTrade,
        User,
        SmartMeter,
        SystemConfig,
        TransactionLog,
        Wallet,
        TokenBlacklist,
        TelemetryAggregate,
      ],
      // synchronize: true,
    }),
    // Removed: BlockchainApprovalsModule, DeviceCommandsModule, DeviceStatusSnapshotsModule, EnergyReadingsDetailedModule, MqttMessageLogsModule, TradeOrdersCacheModule (replaced by Redis)
    EnergySettlementsModule,
    IdrsConversionsModule,
    MarketTradesModule,
    UsersModule,
    SmartMetersModule,
    SystemConfigModule,
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
