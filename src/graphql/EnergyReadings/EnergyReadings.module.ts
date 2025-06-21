import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergyReadingsResolver } from './EnergyReadings.resolver';
import { EnergyReadingsService } from './EnergyReadings.service';
import { EnergyReadings } from './entities/EnergyReadings.entity';
import { SmartMeters } from '../SmartMeters/entities/SmartMeters.entity';
import { SmartMetersModule } from '../SmartMeters/SmartMeters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EnergyReadings,
      SmartMeters,
    ]),
    forwardRef(() => SmartMetersModule),
  ],
  providers: [EnergyReadingsResolver, EnergyReadingsService],
  exports: [EnergyReadingsService, TypeOrmModule],
})
export class EnergyReadingsModule {}
