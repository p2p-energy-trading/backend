import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { TradeOrdersCacheService } from './TradeOrdersCache.service';
import { TradeOrdersCache } from './dto/TradeOrdersCache.output';
import { CreateTradeOrdersCacheInput } from './dto/TradeOrdersCache.input';
import { TradeOrdersCacheArgs } from './dto/TradeOrdersCache.args';
import { Prosumers } from '../Prosumers/dto/Prosumers.output';
import { Wallets } from '../Wallets/dto/Wallets.output';
import { TransactionLogs } from '../TransactionLogs/dto/TransactionLogs.output';

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

  @ResolveField(() => Prosumers, { nullable: true })
  async prosumers(
    @Parent() TradeOrdersCache: TradeOrdersCache,
  ): Promise<any | null> {
    const result = await this.TradeOrdersCacheService.findProsumers(
      TradeOrdersCache.orderId,
    );
    return result[0] || null;
  }

  @ResolveField(() => Wallets, { nullable: true })
  async wallets(
    @Parent() TradeOrdersCache: TradeOrdersCache,
  ): Promise<any | null> {
    const result = await this.TradeOrdersCacheService.findWallets(
      TradeOrdersCache.orderId,
    );
    return result[0] || null;
  }

  @ResolveField(() => [TransactionLogs])
  async transactionlogsList(
    @Parent() TradeOrdersCache: TradeOrdersCache,
  ): Promise<any[]> {
    return this.TradeOrdersCacheService.findTransactionlogsList(
      TradeOrdersCache.orderId,
    );
  }
}
