import { Module } from '@nestjs/common';
import { EnergyController } from './energy.controller';
import { DeviceController } from './device.controller';
import { TradingController } from './trading.controller';
import { WalletController } from './wallet.controller';
import { DashboardController } from './dashboard.controller';
import { HealthController } from './health.controller';
import { ServicesModule } from '../services/services.module';
import { WalletsModule } from '../modules/Wallets/Wallets.module';
import { IdrsConversionsModule } from '../modules/IdrsConversions/IdrsConversions.module';
import { SmartMetersModule } from '../modules/SmartMeters/SmartMeters.module';
import { DeviceCommandsModule } from '../modules/DeviceCommands/DeviceCommands.module';
import { TradeOrdersCacheModule } from '../modules/TradeOrdersCache/TradeOrdersCache.module';
import { MarketTradesModule } from '../modules/MarketTrades/MarketTrades.module';
import { CommonModule } from '../common/common.module';
import { ProsumersModule } from 'src/modules/Prosumers/Prosumers.module';
import { DeviceStatusSnapshotsModule } from 'src/modules/DeviceStatusSnapshots/DeviceStatusSnapshots.module';
import { TokenBlacklistModule } from 'src/modules/TokenBlacklist/TokenBlacklist.module';
import { TransactionLogsModule } from 'src/modules/TransactionLogs/TransactionLogs.module';

@Module({
  imports: [
    ServicesModule,
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
  ],
  controllers: [
    EnergyController,
    DeviceController,
    TradingController,
    WalletController,
    DashboardController,
    HealthController,
  ],
})
export class ControllersModule {}
