import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfigService } from './SystemConfig.service';
import { SystemConfig } from './SystemConfig.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  providers: [SystemConfigService],
  exports: [SystemConfigService, TypeOrmModule],
})
export class SystemConfigModule {}
