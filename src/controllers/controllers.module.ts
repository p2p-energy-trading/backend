import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergyController } from './energy.controller';
import { DeviceController } from './device.controller';
import { TradingController } from './trading.controller';
import { WalletController } from './wallet.controller';
import { DashboardController } from './dashboard.controller';
import { HealthController } from './health.controller';
import { SmartMeterController } from './smart-meter.controller';
import { TelemetryController } from './telemetry.controller';
import { ServicesModule } from '../services/services.module';
import { AuthModule } from '../auth/auth.module';
import { WalletsModule } from '../models/Wallets/Wallets.module';
import { IdrsConversionsModule } from '../models/IdrsConversions/IdrsConversions.module';
import { SmartMetersModule } from '../models/SmartMeters/SmartMeters.module';
import { DeviceCommandsModule } from '../models/DeviceCommands/DeviceCommands.module';
import { TradeOrdersCacheModule } from '../models/TradeOrdersCache/TradeOrdersCache.module';
import { MarketTradesModule } from '../models/MarketTrades/MarketTrades.module';
import { CommonModule } from '../common/common.module';
import { ProsumersModule } from 'src/models/Prosumers/Prosumers.module';
import { DeviceStatusSnapshotsModule } from 'src/models/DeviceStatusSnapshots/DeviceStatusSnapshots.module';
import { TokenBlacklistModule } from 'src/models/TokenBlacklist/TokenBlacklist.module';
import { TransactionLogsModule } from 'src/models/TransactionLogs/TransactionLogs.module';
import { EnergySettlementsModule } from 'src/models/EnergySettlements/EnergySettlements.module';
import { EnergyReadingsDetailedModule } from 'src/models/EnergyReadingsDetailed/EnergyReadingsDetailed.module';
import { TelemetryAggregate } from '../models/TelemetryAggregate/TelemetryAggregate.entity';

@Module({
  imports: [
    ServicesModule,
    AuthModule,
    TypeOrmModule.forFeature([TelemetryAggregate]),
    WalletsModule,
    IdrsConversionsModule,
    SmartMetersModule,
    DeviceCommandsModule,
    TradeOrdersCacheModule,
    MarketTradesModule,
    CommonModule,
    ProsumersModule,
    DeviceStatusSnapshotsModule,
    TokenBlacklistModule,
    TransactionLogsModule,
    EnergySettlementsModule,
    EnergyReadingsDetailedModule,
  ],
  controllers: [
    EnergyController,
    DeviceController,
    TradingController,
    WalletController,
    DashboardController,
    HealthController,
    SmartMeterController,
    TelemetryController,
  ],
})
export class ControllersModule {}
