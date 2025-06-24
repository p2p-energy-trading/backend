import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { IdrsConversionsService } from './IdrsConversions.service';
import { IdrsConversions } from './dto/IdrsConversions.output';
import { CreateIdrsConversionsInput } from './dto/IdrsConversions.input';
import { IdrsConversionsArgs } from './dto/IdrsConversions.args';

@Resolver(() => IdrsConversions)
export class IdrsConversionsResolver {
  constructor(
    private readonly IdrsConversionsService: IdrsConversionsService,
  ) {}

  @Query(() => [IdrsConversions], { name: 'IdrsConversionsAll' })
  findAll(@Args() args: IdrsConversionsArgs) {
    return this.IdrsConversionsService.findAll(args);
  }

  @Query(() => IdrsConversions, { name: 'IdrsConversions' })
  findOne(@Args('conversionId', { type: () => Int }) conversionId: number) {
    return this.IdrsConversionsService.findOne(Number(conversionId));
  }

  @Mutation(() => IdrsConversions)
  createIdrsConversions(@Args('input') input: CreateIdrsConversionsInput) {
    return this.IdrsConversionsService.create(input);
  }

  @Mutation(() => IdrsConversions)
  updateIdrsConversions(
    @Args('conversionId', { type: () => Int }) conversionId: number,
    @Args('input') input: CreateIdrsConversionsInput,
  ) {
    return this.IdrsConversionsService.update(Number(conversionId), input);
  }

  @Mutation(() => Boolean)
  removeIdrsConversions(
    @Args('conversionId', { type: () => Int }) conversionId: number,
  ) {
    return this.IdrsConversionsService.remove(Number(conversionId));
  }
}
