import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ProsumersService } from './Prosumers.service';
import { Prosumers } from './dto/Prosumers.output';
import { CreateProsumersInput } from './dto/Prosumers.input';
import { ProsumersArgs } from './dto/Prosumers.args';

@Resolver(() => Prosumers)
export class ProsumersResolver {
  constructor(private readonly ProsumersService: ProsumersService) {}

  @Query(() => [Prosumers], { name: 'ProsumersAll' })
  findAll(@Args() args: ProsumersArgs) {
    return this.ProsumersService.findAll(args);
  }

  @Query(() => Prosumers, { name: 'Prosumers' })
  findOne(@Args('prosumerId', { type: () => String }) prosumerId: string) {
    return this.ProsumersService.findOne(prosumerId);
  }

  @Mutation(() => Prosumers)
  createProsumers(@Args('input') input: CreateProsumersInput) {
    return this.ProsumersService.create(input);
  }

  @Mutation(() => Prosumers)
  updateProsumers(
    @Args('prosumerId', { type: () => String }) prosumerId: string,
    @Args('input') input: CreateProsumersInput,
  ) {
    return this.ProsumersService.update(prosumerId, input);
  }

  @Mutation(() => Boolean)
  removeProsumers(
    @Args('prosumerId', { type: () => String }) prosumerId: string,
  ) {
    return this.ProsumersService.remove(prosumerId);
  }
}
