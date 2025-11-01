import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionLogsService } from './transactionLog.service';
import { TransactionLog } from './transactionLog.entity';
import { User } from '../user/user.entity';
import { ProsumersModule } from '../user/user.module';
import { EnergySettlement } from '../energySettlement/energySettlement.entity';
import { EnergySettlementsModule } from '../energySettlement/energySettlement.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionLog, User, EnergySettlement]),
    forwardRef(() => ProsumersModule),
    forwardRef(() => EnergySettlementsModule),
  ],
  providers: [TransactionLogsService],
  exports: [TransactionLogsService, TypeOrmModule],
})
export class TransactionLogsModule {}
