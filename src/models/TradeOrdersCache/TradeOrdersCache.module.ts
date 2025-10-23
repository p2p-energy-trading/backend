import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeOrdersCacheService } from './TradeOrdersCache.service';
import { TradeOrdersCache } from './TradeOrdersCache.entity';
import { Prosumers } from '../Prosumers/Prosumers.entity';
import { ProsumersModule } from '../Prosumers/Prosumers.module';
import { Wallets } from '../Wallets/Wallets.entity';
import { WalletsModule } from '../Wallets/Wallets.module';
import { TransactionLogs } from '../TransactionLogs/TransactionLogs.entity';
import { TransactionLogsModule } from '../TransactionLogs/TransactionLogs.module';

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
