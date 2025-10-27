import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionLogsService } from './transactionLog.service';
import { TransactionLogs } from './transactionLog.entity';
import { TradeOrdersCache } from '../tradeOrderCache/tradeOrderCache.entity';
import { TradeOrdersCacheModule } from '../tradeOrderCache/tradeOrderCache.module';
import { Prosumers } from '../user/user.entity';
import { ProsumersModule } from '../user/user.module';
import { EnergySettlements } from '../energySettlement/energySettlement.entity';
import { EnergySettlementsModule } from '../energySettlement/energySettlement.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionLogs,
      TradeOrdersCache,
      Prosumers,
      EnergySettlements,
    ]),
    forwardRef(() => TradeOrdersCacheModule),
    forwardRef(() => ProsumersModule),
    forwardRef(() => EnergySettlementsModule),
  ],
  providers: [TransactionLogsService],
  exports: [TransactionLogsService, TypeOrmModule],
})
export class TransactionLogsModule {}
