import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmartMetersService } from './SmartMeters.service';
import { SmartMeters } from './SmartMeters.entity';
// Removed unused entities:
// - DeviceCommands
// - DeviceStatusSnapshots
// - EnergyReadingsDetailed
// - MqttMessageLogs
import { EnergySettlements } from '../energySettlement/EnergySettlements.entity';
import { EnergySettlementsModule } from '../energySettlement/EnergySettlements.module';
import { Prosumers } from '../prosumer/Prosumers.entity';
import { ProsumersModule } from '../prosumer/Prosumers.module';

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
