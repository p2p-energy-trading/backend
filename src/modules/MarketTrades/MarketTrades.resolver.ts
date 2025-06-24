import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { MarketTradesService } from './MarketTrades.service';
import { MarketTrades } from './dto/MarketTrades.output';
import { CreateMarketTradesInput } from './dto/MarketTrades.input';
import { MarketTradesArgs } from './dto/MarketTrades.args';

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
}
