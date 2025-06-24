import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { SmartMetersService } from './SmartMeters.service';
import { SmartMeters } from './dto/SmartMeters.output';
import { CreateSmartMetersInput } from './dto/SmartMeters.input';
import { SmartMetersArgs } from './dto/SmartMeters.args';

@Resolver(() => SmartMeters)
export class SmartMetersResolver {
  constructor(private readonly SmartMetersService: SmartMetersService) {}

  @Query(() => [SmartMeters], { name: 'SmartMetersAll' })
  findAll(@Args() args: SmartMetersArgs) {
    return this.SmartMetersService.findAll(args);
  }

  @Query(() => SmartMeters, { name: 'SmartMeters' })
  findOne(@Args('meterId', { type: () => String }) meterId: string) {
    return this.SmartMetersService.findOne(meterId);
  }

  @Mutation(() => SmartMeters)
  createSmartMeters(@Args('input') input: CreateSmartMetersInput) {
    return this.SmartMetersService.create(input);
  }

  @Mutation(() => SmartMeters)
  updateSmartMeters(
    @Args('meterId', { type: () => String }) meterId: string,
    @Args('input') input: CreateSmartMetersInput,
  ) {
    return this.SmartMetersService.update(meterId, input);
  }

  @Mutation(() => Boolean)
  removeSmartMeters(@Args('meterId', { type: () => String }) meterId: string) {
    return this.SmartMetersService.remove(meterId);
  }
}
