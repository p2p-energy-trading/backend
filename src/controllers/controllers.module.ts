import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergyController } from './Energy/energy.controller';
// Removed: DeviceController (merged into SmartMeterController)
import { TradingController } from './Trading/trading.controller';
import { BlockchainController } from './Blockchain/blockchain.controller';
import { WalletController } from './Wallet/wallet.controller';
import { StatController } from './Stat/stat.controller';
import { HealthController } from './Health/health.controller';
import { SmartMeterController } from './SmartMeter/smart-meter.controller';
// Removed: TelemetryController (merged into SmartMeterController)
import { ServicesModule } from '../services/services.module';
import { AuthModule } from '../auth/auth.module';
import { WalletsModule } from '../models/Wallets/Wallets.module';
import { IdrsConversionsModule } from '../models/idrsConversion/IdrsConversions.module';
import { SmartMetersModule } from '../models/SmartMeters/SmartMeters.module';
// Removed unused modules:
// - DeviceCommandsModule
// - DeviceStatusSnapshotsModule
// - EnergyReadingsDetailedModule
import { TradeOrdersCacheModule } from '../models/TradeOrdersCache/TradeOrdersCache.module';
import { MarketTradesModule } from '../models/marketTrade/MarketTrades.module';
import { CommonModule } from '../common/common.module';
import { ProsumersModule } from 'src/models/prosumer/Prosumers.module';
import { TokenBlacklistModule } from 'src/models/TokenBlacklist/TokenBlacklist.module';
import { TransactionLogsModule } from 'src/models/TransactionLogs/TransactionLogs.module';
import { EnergySettlementsModule } from 'src/models/energySettlement/EnergySettlements.module';
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
    // Removed: DeviceController (merged into SmartMeterController)
    TradingController,
    BlockchainController,
    WalletController,
    StatController,
    HealthController,
    SmartMeterController, // Now includes Device + Telemetry + SmartMeter endpoints
    // Removed: TelemetryController (merged into SmartMeterController)
  ],
})
export class ControllersModule {}
