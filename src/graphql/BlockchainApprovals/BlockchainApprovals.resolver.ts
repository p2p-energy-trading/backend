import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { BlockchainApprovalsService } from './BlockchainApprovals.service';
import { BlockchainApprovals } from './dto/BlockchainApprovals.output';
import { CreateBlockchainApprovalsInput } from './dto/BlockchainApprovals.input';
import { BlockchainApprovalsArgs } from './dto/BlockchainApprovals.args';
import { Prosumers } from '../Prosumers/dto/Prosumers.output';
import { Wallets } from '../Wallets/dto/Wallets.output';

@Resolver(() => BlockchainApprovals)
export class BlockchainApprovalsResolver {
  constructor(
    private readonly BlockchainApprovalsService: BlockchainApprovalsService,
  ) {}

  @Query(() => [BlockchainApprovals], { name: 'BlockchainApprovalsAll' })
  findAll(@Args() args: BlockchainApprovalsArgs) {
    return this.BlockchainApprovalsService.findAll(args);
  }

  @Query(() => BlockchainApprovals, { name: 'BlockchainApprovals' })
  findOne(@Args('approvalId', { type: () => Int }) approvalId: number) {
    return this.BlockchainApprovalsService.findOne(Number(approvalId));
  }

  @Mutation(() => BlockchainApprovals)
  createBlockchainApprovals(
    @Args('input') input: CreateBlockchainApprovalsInput,
  ) {
    return this.BlockchainApprovalsService.create(input);
  }

  @Mutation(() => BlockchainApprovals)
  updateBlockchainApprovals(
    @Args('approvalId', { type: () => Int }) approvalId: number,
    @Args('input') input: CreateBlockchainApprovalsInput,
  ) {
    return this.BlockchainApprovalsService.update(Number(approvalId), input);
  }

  @Mutation(() => Boolean)
  removeBlockchainApprovals(
    @Args('approvalId', { type: () => Int }) approvalId: number,
  ) {
    return this.BlockchainApprovalsService.remove(Number(approvalId));
  }

  @ResolveField(() => Prosumers, { nullable: true })
  async prosumers(
    @Parent() BlockchainApprovals: BlockchainApprovals,
  ): Promise<any | null> {
    const result = await this.BlockchainApprovalsService.findProsumers(
      Number(BlockchainApprovals.approvalId),
    );
    return result[0] || null;
  }

  @ResolveField(() => Wallets, { nullable: true })
  async wallets(
    @Parent() BlockchainApprovals: BlockchainApprovals,
  ): Promise<any | null> {
    const result = await this.BlockchainApprovalsService.findWallets(
      Number(BlockchainApprovals.approvalId),
    );
    return result[0] || null;
  }
}
