import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { DeviceHeartbeatsService } from './DeviceHeartbeats.service';
import { DeviceHeartbeats } from './dto/DeviceHeartbeats.output';
import { CreateDeviceHeartbeatsInput } from './dto/DeviceHeartbeats.input';
import { DeviceHeartbeatsArgs } from './dto/DeviceHeartbeats.args';
import { SmartMeters } from '../SmartMeters/dto/SmartMeters.output';

@Resolver(() => DeviceHeartbeats)
export class DeviceHeartbeatsResolver {
  constructor(
    private readonly DeviceHeartbeatsService: DeviceHeartbeatsService,
  ) {}

  @Query(() => [DeviceHeartbeats], { name: 'DeviceHeartbeatsAll' })
  findAll(@Args() args: DeviceHeartbeatsArgs) {
    return this.DeviceHeartbeatsService.findAll(args);
  }

  @Query(() => DeviceHeartbeats, { name: 'DeviceHeartbeats' })
  findOne(@Args('heartbeatId', { type: () => Int }) heartbeatId: number) {
    return this.DeviceHeartbeatsService.findOne(Number(heartbeatId));
  }

  @Mutation(() => DeviceHeartbeats)
  createDeviceHeartbeats(@Args('input') input: CreateDeviceHeartbeatsInput) {
    return this.DeviceHeartbeatsService.create(input);
  }

  @Mutation(() => DeviceHeartbeats)
  updateDeviceHeartbeats(
    @Args('heartbeatId', { type: () => Int }) heartbeatId: number,
    @Args('input') input: CreateDeviceHeartbeatsInput,
  ) {
    return this.DeviceHeartbeatsService.update(Number(heartbeatId), input);
  }

  @Mutation(() => Boolean)
  removeDeviceHeartbeats(
    @Args('heartbeatId', { type: () => Int }) heartbeatId: number,
  ) {
    return this.DeviceHeartbeatsService.remove(Number(heartbeatId));
  }

  @ResolveField(() => SmartMeters, { nullable: true })
  async smartmeters(
    @Parent() DeviceHeartbeats: DeviceHeartbeats,
  ): Promise<any | null> {
    const result = await this.DeviceHeartbeatsService.findSmartmeters(
      Number(DeviceHeartbeats.heartbeatId),
    );
    return result[0] || null;
  }
}
