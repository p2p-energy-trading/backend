import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergySettlementsService } from './energySettlement.service';
import { EnergySettlement } from './energySettlement.entity';
import { SmartMeter } from '../smartMeter/smartMeter.entity';
import { SmartMetersModule } from '../smartMeter/smartMeter.module';
// Removed: MqttMessageLogs (table dropped)
import { TransactionLog } from '../transactionLog/transactionLog.entity';
import { TransactionLogsModule } from '../transactionLog/transactionLog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnergySettlement, SmartMeter, TransactionLog]),
    forwardRef(() => SmartMetersModule),
    forwardRef(() => TransactionLogsModule),
  ],
  providers: [EnergySettlementsService],
  exports: [EnergySettlementsService, TypeOrmModule],
})
export class EnergySettlementsModule {}
