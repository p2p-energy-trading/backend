import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryData } from './TelemetryData.entity';
import { TelemetryDataService } from './TelemetryData.service';

@Module({
  imports: [TypeOrmModule.forFeature([TelemetryData])],
  providers: [TelemetryDataService],
  exports: [TelemetryDataService],
})
export class TelemetryDataModule {}
