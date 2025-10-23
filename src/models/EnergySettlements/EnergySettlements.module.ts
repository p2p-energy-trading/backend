import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergySettlementsService } from './EnergySettlements.service';
import { EnergySettlements } from './EnergySettlements.entity';
import { SmartMeters } from '../SmartMeters/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';
import { MqttMessageLogs } from '../MqttMessageLogs/MqttMessageLogs.entity';
import { MqttMessageLogsModule } from '../MqttMessageLogs/MqttMessageLogs.module';
import { TransactionLogs } from '../TransactionLogs/TransactionLogs.entity';
import { TransactionLogsModule } from '../TransactionLogs/TransactionLogs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EnergySettlements,
      SmartMeters,
      MqttMessageLogs,
      TransactionLogs,
    ]),
    forwardRef(() => SmartMetersModule),
    forwardRef(() => MqttMessageLogsModule),
    forwardRef(() => TransactionLogsModule),
  ],
  providers: [EnergySettlementsService],
  exports: [EnergySettlementsService, TypeOrmModule],
})
export class EnergySettlementsModule {}
