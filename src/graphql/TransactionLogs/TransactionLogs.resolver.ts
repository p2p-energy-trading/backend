import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { TransactionLogsService } from './TransactionLogs.service';
import { TransactionLogs } from './dto/TransactionLogs.output';
import { CreateTransactionLogsInput } from './dto/TransactionLogs.input';
import { TransactionLogsArgs } from './dto/TransactionLogs.args';
import { TradeOrdersCache } from '../TradeOrdersCache/dto/TradeOrdersCache.output';
import { Prosumers } from '../Prosumers/dto/Prosumers.output';
import { EnergySettlements } from '../EnergySettlements/dto/EnergySettlements.output';

@Resolver(() => TransactionLogs)
export class TransactionLogsResolver {
  constructor(private readonly TransactionLogsService: TransactionLogsService) {}

  @Query(() => [TransactionLogs], { name: 'TransactionLogsAll' })
  findAll(@Args() args: TransactionLogsArgs) {
    return this.TransactionLogsService.findAll(args);
  }

  @Query(() => TransactionLogs, { name: 'TransactionLogs' })
  findOne(@Args('logId', { type: () => Int }) logId: number) {
    return this.TransactionLogsService.findOne(Number(logId));
  }

  @Mutation(() => TransactionLogs)
  createTransactionLogs(@Args('input') input: CreateTransactionLogsInput) {
    return this.TransactionLogsService.create(input);
  }

  @Mutation(() => TransactionLogs)
  updateTransactionLogs(
    @Args('logId', { type: () => Int }) logId: number,
    @Args('input') input: CreateTransactionLogsInput,
  ) {
    return this.TransactionLogsService.update(Number(logId), input);
  }

  @Mutation(() => Boolean)
  removeTransactionLogs(@Args('logId', { type: () => Int }) logId: number) {
    return this.TransactionLogsService.remove(Number(logId));
  }

  @ResolveField(() => TradeOrdersCache, { nullable: true })
  async tradeorderscache(@Parent() TransactionLogs: TransactionLogs): Promise<any | null> {
    const result = await this.TransactionLogsService.findTradeorderscache(Number(TransactionLogs.logId));
    return result[0] || null;
  }

  @ResolveField(() => Prosumers, { nullable: true })
  async prosumers(@Parent() TransactionLogs: TransactionLogs): Promise<any | null> {
    const result = await this.TransactionLogsService.findProsumers(Number(TransactionLogs.logId));
    return result[0] || null;
  }

  @ResolveField(() => EnergySettlements, { nullable: true })
  async energysettlements(@Parent() TransactionLogs: TransactionLogs): Promise<any | null> {
    const result = await this.TransactionLogsService.findEnergysettlements(Number(TransactionLogs.logId));
    return result[0] || null;
  }
}
