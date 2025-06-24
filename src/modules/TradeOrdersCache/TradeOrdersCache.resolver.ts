import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { TradeOrdersCacheService } from './TradeOrdersCache.service';
import { TradeOrdersCache } from './dto/TradeOrdersCache.output';
import { CreateTradeOrdersCacheInput } from './dto/TradeOrdersCache.input';
import { TradeOrdersCacheArgs } from './dto/TradeOrdersCache.args';

@Resolver(() => TradeOrdersCache)
export class TradeOrdersCacheResolver {
  constructor(
    private readonly TradeOrdersCacheService: TradeOrdersCacheService,
  ) {}

  @Query(() => [TradeOrdersCache], { name: 'TradeOrdersCacheAll' })
  findAll(@Args() args: TradeOrdersCacheArgs) {
    return this.TradeOrdersCacheService.findAll(args);
  }

  @Query(() => TradeOrdersCache, { name: 'TradeOrdersCache' })
  findOne(@Args('orderId', { type: () => String }) orderId: string) {
    return this.TradeOrdersCacheService.findOne(orderId);
  }

  @Mutation(() => TradeOrdersCache)
  createTradeOrdersCache(@Args('input') input: CreateTradeOrdersCacheInput) {
    return this.TradeOrdersCacheService.create(input);
  }

  @Mutation(() => TradeOrdersCache)
  updateTradeOrdersCache(
    @Args('orderId', { type: () => String }) orderId: string,
    @Args('input') input: CreateTradeOrdersCacheInput,
  ) {
    return this.TradeOrdersCacheService.update(orderId, input);
  }

  @Mutation(() => Boolean)
  removeTradeOrdersCache(
    @Args('orderId', { type: () => String }) orderId: string,
  ) {
    return this.TradeOrdersCacheService.remove(orderId);
  }
}
