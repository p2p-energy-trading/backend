import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { BlockchainApprovalsService } from './BlockchainApprovals.service';
import { BlockchainApprovals } from './dto/BlockchainApprovals.output';
import { CreateBlockchainApprovalsInput } from './dto/BlockchainApprovals.input';
import { BlockchainApprovalsArgs } from './dto/BlockchainApprovals.args';

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
}
