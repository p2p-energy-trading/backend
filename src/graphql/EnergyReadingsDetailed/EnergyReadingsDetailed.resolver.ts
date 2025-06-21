import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { EnergyReadingsDetailedService } from './EnergyReadingsDetailed.service';
import { EnergyReadingsDetailed } from './dto/EnergyReadingsDetailed.output';
import { CreateEnergyReadingsDetailedInput } from './dto/EnergyReadingsDetailed.input';
import { EnergyReadingsDetailedArgs } from './dto/EnergyReadingsDetailed.args';
import { SmartMeters } from '../SmartMeters/dto/SmartMeters.output';

@Resolver(() => EnergyReadingsDetailed)
export class EnergyReadingsDetailedResolver {
  constructor(private readonly EnergyReadingsDetailedService: EnergyReadingsDetailedService) {}

  @Query(() => [EnergyReadingsDetailed], { name: 'EnergyReadingsDetailedAll' })
  findAll(@Args() args: EnergyReadingsDetailedArgs) {
    return this.EnergyReadingsDetailedService.findAll(args);
  }

  @Query(() => EnergyReadingsDetailed, { name: 'EnergyReadingsDetailed' })
  findOne(@Args('readingId', { type: () => Int }) readingId: number) {
    return this.EnergyReadingsDetailedService.findOne(Number(readingId));
  }

  @Mutation(() => EnergyReadingsDetailed)
  createEnergyReadingsDetailed(@Args('input') input: CreateEnergyReadingsDetailedInput) {
    return this.EnergyReadingsDetailedService.create(input);
  }

  @Mutation(() => EnergyReadingsDetailed)
  updateEnergyReadingsDetailed(
    @Args('readingId', { type: () => Int }) readingId: number,
    @Args('input') input: CreateEnergyReadingsDetailedInput,
  ) {
    return this.EnergyReadingsDetailedService.update(Number(readingId), input);
  }

  @Mutation(() => Boolean)
  removeEnergyReadingsDetailed(@Args('readingId', { type: () => Int }) readingId: number) {
    return this.EnergyReadingsDetailedService.remove(Number(readingId));
  }

  @ResolveField(() => SmartMeters, { nullable: true })
  async smartmeters(@Parent() EnergyReadingsDetailed: EnergyReadingsDetailed): Promise<any | null> {
    const result = await this.EnergyReadingsDetailedService.findSmartmeters(Number(EnergyReadingsDetailed.readingId));
    return result[0] || null;
  }
}
