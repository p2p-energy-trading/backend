import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionLogsService } from './TransactionLogs.service';
import { TransactionLogs } from './TransactionLogs.entity';
import { TradeOrdersCache } from '../tradeOrdersCache/TradeOrdersCache.entity';
import { TradeOrdersCacheModule } from '../tradeOrdersCache/TradeOrdersCache.module';
import { Prosumers } from '../prosumer/user.entity';
import { ProsumersModule } from '../prosumer/user.module';
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
