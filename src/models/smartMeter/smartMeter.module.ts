import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmartMetersService } from './smartMeter.service';
import { SmartMeter } from './smartMeter.entity';
// Removed unused entities:
// - DeviceCommands
// - DeviceStatusSnapshots
// - EnergyReadingsDetailed
// - MqttMessageLogs
import { EnergySettlement } from '../energySettlement/energySettlement.entity';
import { EnergySettlementsModule } from '../energySettlement/energySettlement.module';
import { User } from '../user/user.entity';
import { ProsumersModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SmartMeter, EnergySettlement, User]),
    forwardRef(() => EnergySettlementsModule),
    forwardRef(() => ProsumersModule),
  ],
  providers: [SmartMetersService],
  exports: [SmartMetersService, TypeOrmModule],
})
export class SmartMetersModule {}
