import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { EnergyReadingsService } from './EnergyReadings.service';
import { EnergyReadings } from './dto/EnergyReadings.output';
import { CreateEnergyReadingsInput } from './dto/EnergyReadings.input';
import { EnergyReadingsArgs } from './dto/EnergyReadings.args';
import { SmartMeters } from '../SmartMeters/dto/SmartMeters.output';

@Resolver(() => EnergyReadings)
export class EnergyReadingsResolver {
  constructor(private readonly EnergyReadingsService: EnergyReadingsService) {}

  @Query(() => [EnergyReadings], { name: 'EnergyReadingsAll' })
  findAll(@Args() args: EnergyReadingsArgs) {
    return this.EnergyReadingsService.findAll(args);
  }

  @Query(() => EnergyReadings, { name: 'EnergyReadings' })
  findOne(@Args('readingId', { type: () => Int }) readingId: number) {
    return this.EnergyReadingsService.findOne(Number(readingId));
  }

  @Mutation(() => EnergyReadings)
  createEnergyReadings(@Args('input') input: CreateEnergyReadingsInput) {
    return this.EnergyReadingsService.create(input);
  }

  @Mutation(() => EnergyReadings)
  updateEnergyReadings(
    @Args('readingId', { type: () => Int }) readingId: number,
    @Args('input') input: CreateEnergyReadingsInput,
  ) {
    return this.EnergyReadingsService.update(Number(readingId), input);
  }

  @Mutation(() => Boolean)
  removeEnergyReadings(
    @Args('readingId', { type: () => Int }) readingId: number,
  ) {
    return this.EnergyReadingsService.remove(Number(readingId));
  }

  @ResolveField(() => SmartMeters, { nullable: true })
  async smartmeters(
    @Parent() EnergyReadings: EnergyReadings,
  ): Promise<any | null> {
    const result = await this.EnergyReadingsService.findSmartmeters(
      Number(EnergyReadings.readingId),
    );
    return result[0] || null;
  }
}
