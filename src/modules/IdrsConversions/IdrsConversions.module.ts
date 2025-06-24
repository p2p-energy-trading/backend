import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdrsConversionsResolver } from './IdrsConversions.resolver';
import { IdrsConversionsService } from './IdrsConversions.service';
import { IdrsConversions } from './entities/IdrsConversions.entity';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
import { ProsumersModule } from '../Prosumers/Prosumers.module';
import { Wallets } from '../Wallets/entities/Wallets.entity';
import { WalletsModule } from '../Wallets/Wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IdrsConversions, Prosumers, Wallets]),
    forwardRef(() => ProsumersModule),
    forwardRef(() => WalletsModule),
  ],
  providers: [IdrsConversionsResolver, IdrsConversionsService],
  exports: [IdrsConversionsService, TypeOrmModule],
})
export class IdrsConversionsModule {}
