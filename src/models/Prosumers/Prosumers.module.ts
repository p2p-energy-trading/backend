import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProsumersService } from './Prosumers.service';
import { Prosumers } from './Prosumers.entity';
// Removed: BlockchainApprovals (not used), DeviceCommands (table dropped)
import { IdrsConversions } from '../IdrsConversions/IdrsConversions.entity';
import { IdrsConversionsModule } from '../IdrsConversions/IdrsConversions.module';
import { MarketTrades } from '../MarketTrades/MarketTrades.entity';
import { MarketTradesModule } from '../MarketTrades/MarketTrades.module';
import { SmartMeters } from '../SmartMeters/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';
import { TradeOrdersCache } from '../TradeOrdersCache/TradeOrdersCache.entity';
import { TradeOrdersCacheModule } from '../TradeOrdersCache/TradeOrdersCache.module';
import { TransactionLogs } from '../TransactionLogs/TransactionLogs.entity';
import { TransactionLogsModule } from '../TransactionLogs/TransactionLogs.module';
import { Wallets } from '../Wallets/Wallets.entity';
import { WalletsModule } from '../Wallets/Wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Prosumers,
      IdrsConversions,
      MarketTrades,
      SmartMeters,
      TradeOrdersCache,
      TransactionLogs,
      Wallets,
    ]),
    forwardRef(() => IdrsConversionsModule),
    forwardRef(() => MarketTradesModule),
    forwardRef(() => SmartMetersModule),
    forwardRef(() => TradeOrdersCacheModule),
    forwardRef(() => TransactionLogsModule),
    forwardRef(() => WalletsModule),
  ],
  providers: [ProsumersService],
  exports: [ProsumersService, TypeOrmModule],
})
export class ProsumersModule {}
