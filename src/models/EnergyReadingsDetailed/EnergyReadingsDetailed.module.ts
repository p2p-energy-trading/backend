import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergyReadingsDetailedService } from './EnergyReadingsDetailed.service';
import { EnergyReadingsDetailed } from './EnergyReadingsDetailed.entity';
import { SmartMeters } from '../SmartMeters/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnergyReadingsDetailed, SmartMeters]),
    forwardRef(() => SmartMetersModule),
  ],
  providers: [EnergyReadingsDetailedService],
  exports: [EnergyReadingsDetailedService, TypeOrmModule],
})
export class EnergyReadingsDetailedModule {}
