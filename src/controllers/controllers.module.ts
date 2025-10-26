import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergyController } from './energy.controller';
import { DeviceController } from './device.controller';
import { TradingController } from './trading.controller';
import { BlockchainController } from './blockchain.controller';
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
// Removed unused modules:
// - DeviceCommandsModule
// - DeviceStatusSnapshotsModule
// - EnergyReadingsDetailedModule
import { TradeOrdersCacheModule } from '../models/TradeOrdersCache/TradeOrdersCache.module';
import { MarketTradesModule } from '../models/MarketTrades/MarketTrades.module';
import { CommonModule } from '../common/common.module';
import { ProsumersModule } from 'src/models/Prosumers/Prosumers.module';
import { TokenBlacklistModule } from 'src/models/TokenBlacklist/TokenBlacklist.module';
import { TransactionLogsModule } from 'src/models/TransactionLogs/TransactionLogs.module';
import { EnergySettlementsModule } from 'src/models/EnergySettlements/EnergySettlements.module';
// Removed: EnergyReadingsDetailedModule
import { TelemetryAggregate } from '../models/TelemetryAggregate/TelemetryAggregate.entity';

@Module({
  imports: [
    ServicesModule,
    AuthModule,
    TypeOrmModule.forFeature([TelemetryAggregate]),
    WalletsModule,
    IdrsConversionsModule,
    SmartMetersModule,
    // Removed: DeviceCommandsModule, DeviceStatusSnapshotsModule, EnergyReadingsDetailedModule
    TradeOrdersCacheModule,
    MarketTradesModule,
    CommonModule,
    ProsumersModule,
    TokenBlacklistModule,
    TransactionLogsModule,
    EnergySettlementsModule,
    // Removed: EnergyReadingsDetailedModule
  ],
  controllers: [
    EnergyController,
    DeviceController,
    TradingController,
    BlockchainController,
    WalletController,
    DashboardController,
    HealthController,
    SmartMeterController,
    TelemetryController,
  ],
})
export class ControllersModule {}
