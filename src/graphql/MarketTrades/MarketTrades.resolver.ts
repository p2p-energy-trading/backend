import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { MarketTradesService } from './MarketTrades.service';
import { MarketTrades } from './dto/MarketTrades.output';
import { CreateMarketTradesInput } from './dto/MarketTrades.input';
import { MarketTradesArgs } from './dto/MarketTrades.args';
import { Prosumers } from '../Prosumers/dto/Prosumers.output';
import { Wallets } from '../Wallets/dto/Wallets.output';

@Resolver(() => MarketTrades)
export class MarketTradesResolver {
  constructor(private readonly MarketTradesService: MarketTradesService) {}

  @Query(() => [MarketTrades], { name: 'MarketTradesAll' })
  findAll(@Args() args: MarketTradesArgs) {
    return this.MarketTradesService.findAll(args);
  }

  @Query(() => MarketTrades, { name: 'MarketTrades' })
  findOne(@Args('tradeId', { type: () => Int }) tradeId: number) {
    return this.MarketTradesService.findOne(Number(tradeId));
  }

  @Mutation(() => MarketTrades)
  createMarketTrades(@Args('input') input: CreateMarketTradesInput) {
    return this.MarketTradesService.create(input);
  }

  @Mutation(() => MarketTrades)
  updateMarketTrades(
    @Args('tradeId', { type: () => Int }) tradeId: number,
    @Args('input') input: CreateMarketTradesInput,
  ) {
    return this.MarketTradesService.update(Number(tradeId), input);
  }

  @Mutation(() => Boolean)
  removeMarketTrades(@Args('tradeId', { type: () => Int }) tradeId: number) {
    return this.MarketTradesService.remove(Number(tradeId));
  }

  @ResolveField(() => Prosumers, { nullable: true })
  async prosumers(@Parent() MarketTrades: MarketTrades): Promise<any | null> {
    const result = await this.MarketTradesService.findProsumers(Number(MarketTrades.tradeId));
    return result[0] || null;
  }

  @ResolveField(() => Wallets, { nullable: true })
  async wallets(@Parent() MarketTrades: MarketTrades): Promise<any | null> {
    const result = await this.MarketTradesService.findWallets(Number(MarketTrades.tradeId));
    return result[0] || null;
  }

  @ResolveField(() => Prosumers, { nullable: true })
  async prosumers2(@Parent() MarketTrades: MarketTrades): Promise<any | null> {
    const result = await this.MarketTradesService.findProsumers2(Number(MarketTrades.tradeId));
    return result[0] || null;
  }

  @ResolveField(() => Wallets, { nullable: true })
  async wallets2(@Parent() MarketTrades: MarketTrades): Promise<any | null> {
    const result = await this.MarketTradesService.findWallets2(Number(MarketTrades.tradeId));
    return result[0] || null;
  }
}
