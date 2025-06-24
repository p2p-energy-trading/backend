import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { DeviceCommandsService } from './DeviceCommands.service';
import { DeviceCommands } from './dto/DeviceCommands.output';
import { CreateDeviceCommandsInput } from './dto/DeviceCommands.input';
import { DeviceCommandsArgs } from './dto/DeviceCommands.args';

@Resolver(() => DeviceCommands)
export class DeviceCommandsResolver {
  constructor(private readonly DeviceCommandsService: DeviceCommandsService) {}

  @Query(() => [DeviceCommands], { name: 'DeviceCommandsAll' })
  findAll(@Args() args: DeviceCommandsArgs) {
    return this.DeviceCommandsService.findAll(args);
  }

  @Query(() => DeviceCommands, { name: 'DeviceCommands' })
  findOne(@Args('commandId', { type: () => Int }) commandId: number) {
    return this.DeviceCommandsService.findOne(Number(commandId));
  }

  @Mutation(() => DeviceCommands)
  createDeviceCommands(@Args('input') input: CreateDeviceCommandsInput) {
    return this.DeviceCommandsService.create(input);
  }

  @Mutation(() => DeviceCommands)
  updateDeviceCommands(
    @Args('commandId', { type: () => Int }) commandId: number,
    @Args('input') input: CreateDeviceCommandsInput,
  ) {
    return this.DeviceCommandsService.update(Number(commandId), input);
  }

  @Mutation(() => Boolean)
  removeDeviceCommands(
    @Args('commandId', { type: () => Int }) commandId: number,
  ) {
    return this.DeviceCommandsService.remove(Number(commandId));
  }
}
