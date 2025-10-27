import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergyController } from './energy/energy.controller';
// Removed: DeviceController (merged into SmartMeterController)
import { TradingController } from './trading/trading.controller';
import { BlockchainController } from './blockchain/blockchain.controller';
import { WalletController } from './wallet/wallet.controller';
import { StatController } from './stat/stat.controller';
import { HealthController } from './health/health.controller';
import { SmartMeterController } from './smartMeter/smart-meter.controller';
// Removed: TelemetryController (merged into SmartMeterController)
import { ServicesModule } from '../services/services.module';
import { AuthModule } from '../auth/auth.module';
import { WalletsModule } from '../models/wallet/wallet.module';
import { IdrsConversionsModule } from '../models/idrsConversion/idrsConversion.module';
import { SmartMetersModule } from '../models/smartMeter/smartMeter.module';
// Removed unused modules:
// - DeviceCommandsModule
// - DeviceStatusSnapshotsModule
// - EnergyReadingsDetailedModule
import { TradeOrdersCacheModule } from '../models/tradeOrderCache/tradeOrderCache.module';
import { MarketTradesModule } from '../models/marketTrade/marketTrade.module';
import { CommonModule } from '../common/common.module';
import { ProsumersModule } from 'src/models/user/user.module';
import { TokenBlacklistModule } from 'src/models/tokenBlacklist/tokenBlacklist.module';
import { TransactionLogsModule } from 'src/models/transactionLog/transactionLog.module';
import { EnergySettlementsModule } from 'src/models/energySettlement/energySettlement.module';
// Removed: EnergyReadingsDetailedModule
import { TelemetryAggregate } from '../models/telemetryAggregate/telemetryAggregate.entity';

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
