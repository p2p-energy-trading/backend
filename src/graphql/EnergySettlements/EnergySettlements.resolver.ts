import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { EnergySettlementsService } from './EnergySettlements.service';
import { EnergySettlements } from './dto/EnergySettlements.output';
import { CreateEnergySettlementsInput } from './dto/EnergySettlements.input';
import { EnergySettlementsArgs } from './dto/EnergySettlements.args';
import { SmartMeters } from '../SmartMeters/dto/SmartMeters.output';
import { MqttMessageLogs } from '../MqttMessageLogs/dto/MqttMessageLogs.output';
import { TransactionLogs } from '../TransactionLogs/dto/TransactionLogs.output';

@Resolver(() => EnergySettlements)
export class EnergySettlementsResolver {
  constructor(
    private readonly EnergySettlementsService: EnergySettlementsService,
  ) {}

  @Query(() => [EnergySettlements], { name: 'EnergySettlementsAll' })
  findAll(@Args() args: EnergySettlementsArgs) {
    return this.EnergySettlementsService.findAll(args);
  }

  @Query(() => EnergySettlements, { name: 'EnergySettlements' })
  findOne(@Args('settlementId', { type: () => Int }) settlementId: number) {
    return this.EnergySettlementsService.findOne(Number(settlementId));
  }

  @Mutation(() => EnergySettlements)
  createEnergySettlements(@Args('input') input: CreateEnergySettlementsInput) {
    return this.EnergySettlementsService.create(input);
  }

  @Mutation(() => EnergySettlements)
  updateEnergySettlements(
    @Args('settlementId', { type: () => Int }) settlementId: number,
    @Args('input') input: CreateEnergySettlementsInput,
  ) {
    return this.EnergySettlementsService.update(Number(settlementId), input);
  }

  @Mutation(() => Boolean)
  removeEnergySettlements(
    @Args('settlementId', { type: () => Int }) settlementId: number,
  ) {
    return this.EnergySettlementsService.remove(Number(settlementId));
  }

  @ResolveField(() => SmartMeters, { nullable: true })
  async smartmeters(
    @Parent() EnergySettlements: EnergySettlements,
  ): Promise<any | null> {
    const result = await this.EnergySettlementsService.findSmartmeters(
      Number(EnergySettlements.settlementId),
    );
    return result[0] || null;
  }

  @ResolveField(() => MqttMessageLogs, { nullable: true })
  async mqttmessagelogs(
    @Parent() EnergySettlements: EnergySettlements,
  ): Promise<any | null> {
    const result = await this.EnergySettlementsService.findMqttmessagelogs(
      Number(EnergySettlements.settlementId),
    );
    return result[0] || null;
  }

  @ResolveField(() => [TransactionLogs])
  async transactionlogsList(
    @Parent() EnergySettlements: EnergySettlements,
  ): Promise<any[]> {
    return this.EnergySettlementsService.findTransactionlogsList(
      EnergySettlements.settlementId,
    );
  }
}
