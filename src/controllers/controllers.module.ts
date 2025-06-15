import { Module } from '@nestjs/common';
import { EnergyController } from './energy.controller';
import { DeviceController } from './device.controller';
import { TradingController } from './trading.controller';
import { WalletController } from './wallet.controller';
import { DashboardController } from './dashboard.controller';
import { HealthController } from './health.controller';
import { ServicesModule } from '../services/services.module';
import { WalletsModule } from '../graphql/Wallets/Wallets.module';
import { IdrsConversionsModule } from '../graphql/IdrsConversions/IdrsConversions.module';
import { SmartMetersModule } from '../graphql/SmartMeters/SmartMeters.module';
import { DeviceCommandsModule } from '../graphql/DeviceCommands/DeviceCommands.module';
import { TradeOrdersCacheModule } from '../graphql/TradeOrdersCache/TradeOrdersCache.module';
import { MarketTradesModule } from '../graphql/MarketTrades/MarketTrades.module';
import { CommonModule } from '../common/common.module';

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
