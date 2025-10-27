import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeOrdersCacheService } from './TradeOrdersCache.service';
import { TradeOrdersCache } from './TradeOrdersCache.entity';
import { Prosumers } from '../prosumer/user.entity';
import { ProsumersModule } from '../prosumer/user.module';
import { Wallets } from '../wallet/Wallets.entity';
import { WalletsModule } from '../wallet/Wallets.module';
import { TransactionLogs } from '../transactionLog/TransactionLogs.entity';
import { TransactionLogsModule } from '../transactionLog/TransactionLogs.module';

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
