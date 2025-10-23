import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainApprovalsService } from './BlockchainApprovals.service';
import { BlockchainApprovals } from './BlockchainApprovals.entity';
import { Prosumers } from '../Prosumers/Prosumers.entity';
import { ProsumersModule } from '../Prosumers/Prosumers.module';
import { Wallets } from '../Wallets/Wallets.entity';
import { WalletsModule } from '../Wallets/Wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockchainApprovals, Prosumers, Wallets]),
    forwardRef(() => ProsumersModule),
    forwardRef(() => WalletsModule),
  ],
  providers: [BlockchainApprovalsService],
  exports: [BlockchainApprovalsService, TypeOrmModule],
})
export class BlockchainApprovalsModule {}
