import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttMessageLogsService } from './MqttMessageLogs.service';
import { MqttMessageLogs } from './MqttMessageLogs.entity';
import { EnergySettlements } from '../EnergySettlements/EnergySettlements.entity';
import { EnergySettlementsModule } from '../EnergySettlements/EnergySettlements.module';
import { SmartMeters } from '../SmartMeters/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MqttMessageLogs, EnergySettlements, SmartMeters]),
    forwardRef(() => EnergySettlementsModule),
    forwardRef(() => SmartMetersModule),
  ],
  providers: [MqttMessageLogsService],
  exports: [MqttMessageLogsService, TypeOrmModule],
})
export class MqttMessageLogsModule {}
