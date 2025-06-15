import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { DeviceCommandsService } from './DeviceCommands.service';
import { DeviceCommands } from './dto/DeviceCommands.output';
import { CreateDeviceCommandsInput } from './dto/DeviceCommands.input';
import { DeviceCommandsArgs } from './dto/DeviceCommands.args';
import { SmartMeters } from '../SmartMeters/dto/SmartMeters.output';
import { Prosumers } from '../Prosumers/dto/Prosumers.output';

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

  @ResolveField(() => SmartMeters, { nullable: true })
  async smartmeters(
    @Parent() DeviceCommands: DeviceCommands,
  ): Promise<any | null> {
    const result = await this.DeviceCommandsService.findSmartmeters(
      Number(DeviceCommands.commandId),
    );
    return result[0] || null;
  }

  @ResolveField(() => Prosumers, { nullable: true })
  async prosumers(
    @Parent() DeviceCommands: DeviceCommands,
  ): Promise<any | null> {
    const result = await this.DeviceCommandsService.findProsumers(
      Number(DeviceCommands.commandId),
    );
    return result[0] || null;
  }
}
