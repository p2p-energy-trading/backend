import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { WalletsService } from './Wallets.service';
import { Wallets } from './dto/Wallets.output';
import { CreateWalletsInput } from './dto/Wallets.input';
import { WalletsArgs } from './dto/Wallets.args';
import { BlockchainApprovals } from '../BlockchainApprovals/dto/BlockchainApprovals.output';
import { IdrsConversions } from '../IdrsConversions/dto/IdrsConversions.output';
import { MarketTrades } from '../MarketTrades/dto/MarketTrades.output';
import { TradeOrdersCache } from '../TradeOrdersCache/dto/TradeOrdersCache.output';
import { Prosumers } from '../Prosumers/dto/Prosumers.output';

@Resolver(() => Wallets)
export class WalletsResolver {
  constructor(private readonly WalletsService: WalletsService) {}

  @Query(() => [Wallets], { name: 'WalletsAll' })
  findAll(@Args() args: WalletsArgs) {
    return this.WalletsService.findAll(args);
  }

  @Query(() => Wallets, { name: 'Wallets' })
  findOne(@Args('walletAddress', { type: () => String }) walletAddress: string) {
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
  removeWallets(@Args('walletAddress', { type: () => String }) walletAddress: string) {
    return this.WalletsService.remove(walletAddress);
  }

  @ResolveField(() => [BlockchainApprovals])
  async blockchainapprovalsList(@Parent() Wallets: Wallets): Promise<any[]> {
    return this.WalletsService.findBlockchainapprovalsList(
      Wallets.walletAddress
    );
  }

  @ResolveField(() => [IdrsConversions])
  async idrsconversionsList(@Parent() Wallets: Wallets): Promise<any[]> {
    return this.WalletsService.findIdrsconversionsList(
      Wallets.walletAddress
    );
  }

  @ResolveField(() => [MarketTrades])
  async markettradesList(@Parent() Wallets: Wallets): Promise<any[]> {
    return this.WalletsService.findMarkettradesList(
      Wallets.walletAddress
    );
  }

  @ResolveField(() => [MarketTrades])
  async markettradesList2(@Parent() Wallets: Wallets): Promise<any[]> {
    return this.WalletsService.findMarkettradesList2(
      Wallets.walletAddress
    );
  }

  @ResolveField(() => [TradeOrdersCache])
  async tradeorderscacheList(@Parent() Wallets: Wallets): Promise<any[]> {
    return this.WalletsService.findTradeorderscacheList(
      Wallets.walletAddress
    );
  }

  @ResolveField(() => Prosumers, { nullable: true })
  async prosumers(@Parent() Wallets: Wallets): Promise<any | null> {
    const result = await this.WalletsService.findProsumers(Wallets.walletAddress);
    return result[0] || null;
  }
}
