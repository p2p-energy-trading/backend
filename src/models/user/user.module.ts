import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProsumersService } from './user.service';
import { User } from './user.entity';
// Removed: BlockchainApprovals (not used), DeviceCommands (table dropped)
import { IdrsConversion } from '../idrsConversion/idrsConversion.entity';
import { IdrsConversionsModule } from '../idrsConversion/idrsConversion.module';
import { MarketTrade } from '../marketTrade/marketTrade.entity';
import { MarketTradesModule } from '../marketTrade/marketTrade.module';
import { SmartMeter } from '../smartMeter/smartMeter.entity';
import { SmartMetersModule } from '../smartMeter/smartMeter.module';
import { TradeOrdersCache } from '../tradeOrderCache/tradeOrderCache.entity';
import { TradeOrdersCacheModule } from '../tradeOrderCache/tradeOrderCache.module';
import { TransactionLog } from '../transactionLog/transactionLog.entity';
import { TransactionLogsModule } from '../transactionLog/transactionLog.module';
import { Wallet } from '../wallet/wallet.entity';
import { WalletsModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      IdrsConversion,
      MarketTrade,
      SmartMeter,
      TradeOrdersCache,
      TransactionLog,
      Wallet,
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
