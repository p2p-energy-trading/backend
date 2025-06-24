import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { EnergySettlementsService } from './EnergySettlements.service';
import { EnergySettlements } from './dto/EnergySettlements.output';
import { CreateEnergySettlementsInput } from './dto/EnergySettlements.input';
import { EnergySettlementsArgs } from './dto/EnergySettlements.args';

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
}
