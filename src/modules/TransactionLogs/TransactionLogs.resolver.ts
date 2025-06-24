import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { TransactionLogsService } from './TransactionLogs.service';
import { TransactionLogs } from './dto/TransactionLogs.output';
import { CreateTransactionLogsInput } from './dto/TransactionLogs.input';
import { TransactionLogsArgs } from './dto/TransactionLogs.args';
import {} from '../EnergySettlements/dto/EnergySettlements.output';

@Resolver(() => TransactionLogs)
export class TransactionLogsResolver {
  constructor(
    private readonly TransactionLogsService: TransactionLogsService,
  ) {}

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
}
