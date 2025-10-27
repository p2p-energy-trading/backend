import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeOrdersCacheService } from './tradeOrderCache.service';
import { TradeOrdersCache } from './tradeOrderCache.entity';
import { User } from '../user/user.entity';
import { ProsumersModule } from '../user/user.module';
import { Wallet } from '../wallet/wallet.entity';
import { WalletsModule } from '../wallet/wallet.module';
import { TransactionLog } from '../transactionLog/transactionLog.entity';
import { TransactionLogsModule } from '../transactionLog/transactionLog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TradeOrdersCache, User, Wallet, TransactionLog]),
    forwardRef(() => ProsumersModule),
    forwardRef(() => WalletsModule),
    forwardRef(() => TransactionLogsModule),
  ],
  providers: [TradeOrdersCacheService],
  exports: [TradeOrdersCacheService, TypeOrmModule],
})
export class TradeOrdersCacheModule {}
