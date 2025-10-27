import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmartMetersService } from './SmartMeters.service';
import { SmartMeters } from './SmartMeters.entity';
// Removed unused entities:
// - DeviceCommands
// - DeviceStatusSnapshots
// - EnergyReadingsDetailed
// - MqttMessageLogs
import { EnergySettlements } from '../energySettlement/energySettlement.entity';
import { EnergySettlementsModule } from '../energySettlement/energySettlement.module';
import { Prosumers } from '../user/user.entity';
import { ProsumersModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SmartMeters, EnergySettlements, Prosumers]),
    forwardRef(() => EnergySettlementsModule),
    forwardRef(() => ProsumersModule),
  ],
  providers: [SmartMetersService],
  exports: [SmartMetersService, TypeOrmModule],
})
export class SmartMetersModule {}
