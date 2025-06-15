import { Module } from '@nestjs/common';
import { EnergyBusinessResolver } from './energy-business.resolver';
import { ServicesModule } from '../../services/services.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [ServicesModule, AuthModule],
  providers: [EnergyBusinessResolver],
})
export class BusinessModule {}
