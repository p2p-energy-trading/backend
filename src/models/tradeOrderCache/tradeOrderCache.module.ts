import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeOrdersCacheService } from './tradeOrderCache.service';
import { TradeOrdersCache } from './tradeOrderCache.entity';
import { Prosumers } from '../user/user.entity';
import { ProsumersModule } from '../user/user.module';
import { Wallets } from '../wallet/wallet.entity';
import { WalletsModule } from '../wallet/wallet.module';
import { TransactionLogs } from '../transactionLog/transactionLog.entity';
import { TransactionLogsModule } from '../transactionLog/transactionLog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TradeOrdersCache,
      Prosumers,
      Wallets,
      TransactionLogs,
    ]),
    forwardRef(() => ProsumersModule),
    forwardRef(() => WalletsModule),
    forwardRef(() => TransactionLogsModule),
  ],
  providers: [TradeOrdersCacheService],
  exports: [TradeOrdersCacheService, TypeOrmModule],
})
export class TradeOrdersCacheModule {}
