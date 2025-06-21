import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainApprovalsResolver } from './BlockchainApprovals.resolver';
import { BlockchainApprovalsService } from './BlockchainApprovals.service';
import { BlockchainApprovals } from './entities/BlockchainApprovals.entity';
import { Prosumers } from '../Prosumers/entities/Prosumers.entity';
import { ProsumersModule } from '../Prosumers/Prosumers.module';
import { Wallets } from '../Wallets/entities/Wallets.entity';
import { WalletsModule } from '../Wallets/Wallets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlockchainApprovals,
      Prosumers,
      Wallets,
    ]),
    forwardRef(() => ProsumersModule),
    forwardRef(() => WalletsModule),
  ],
  providers: [BlockchainApprovalsResolver, BlockchainApprovalsService],
  exports: [BlockchainApprovalsService, TypeOrmModule],
})
export class BlockchainApprovalsModule {}
