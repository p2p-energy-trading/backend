import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProsumersService } from './user.service';
import { Prosumers } from './user.entity';
// Removed: BlockchainApprovals (not used), DeviceCommands (table dropped)
import { IdrsConversions } from '../idrsConversion/idrsConversion.entity';
import { IdrsConversionsModule } from '../idrsConversion/idrsConversion.module';
import { MarketTrades } from '../marketTrade/marketTrade.entity';
import { MarketTradesModule } from '../marketTrade/marketTrade.module';
import { SmartMeters } from '../smartMeter/SmartMeters.entity';
import { SmartMetersModule } from '../smartMeter/SmartMeters.module';
import { TradeOrdersCache } from '../tradeOrdersCache/TradeOrdersCache.entity';
import { TradeOrdersCacheModule } from '../tradeOrdersCache/TradeOrdersCache.module';
import { TransactionLogs } from '../transactionLog/TransactionLogs.entity';
import { TransactionLogsModule } from '../transactionLog/TransactionLogs.module';
import { Wallets } from '../wallet/Wallets.entity';
import { WalletsModule } from '../wallet/Wallets.module';

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
