import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { WalletsService } from './Wallets.service';
import { Wallets } from './dto/Wallets.output';
import { CreateWalletsInput } from './dto/Wallets.input';
import { WalletsArgs } from './dto/Wallets.args';

@Resolver(() => Wallets)
export class WalletsResolver {
  constructor(private readonly WalletsService: WalletsService) {}

  @Query(() => [Wallets], { name: 'WalletsAll' })
  findAll(@Args() args: WalletsArgs) {
    return this.WalletsService.findAll(args);
  }

  @Query(() => Wallets, { name: 'Wallets' })
  findOne(
    @Args('walletAddress', { type: () => String }) walletAddress: string,
  ) {
    return this.WalletsService.findOne(walletAddress);
  }

  @Mutation(() => Wallets)
  createWallets(@Args('input') input: CreateWalletsInput) {
    return this.WalletsService.create(input);
  }

  @Mutation(() => Wallets)
  updateWallets(
    @Args('walletAddress', { type: () => String }) walletAddress: string,
    @Args('input') input: CreateWalletsInput,
  ) {
    return this.WalletsService.update(walletAddress, input);
  }

  @Mutation(() => Boolean)
  removeWallets(
    @Args('walletAddress', { type: () => String }) walletAddress: string,
  ) {
    return this.WalletsService.remove(walletAddress);
  }
}
