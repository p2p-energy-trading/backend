import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergyReadingsDetailedResolver } from './EnergyReadingsDetailed.resolver';
import { EnergyReadingsDetailedService } from './EnergyReadingsDetailed.service';
import { EnergyReadingsDetailed } from './entities/EnergyReadingsDetailed.entity';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnergyReadingsDetailed, SmartMeters]),
    forwardRef(() => SmartMetersModule),
  ],
  providers: [EnergyReadingsDetailedResolver, EnergyReadingsDetailedService],
  exports: [EnergyReadingsDetailedService, TypeOrmModule],
})
export class EnergyReadingsDetailedModule {}
