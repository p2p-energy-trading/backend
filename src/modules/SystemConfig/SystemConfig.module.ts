import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfigResolver } from './SystemConfig.resolver';
import { SystemConfigService } from './SystemConfig.service';
import { SystemConfig } from './entities/SystemConfig.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemConfig,
    ]),
  ],
  providers: [SystemConfigResolver, SystemConfigService],
  exports: [SystemConfigService, TypeOrmModule],
})
export class SystemConfigModule {}
