import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { DeviceStatusSnapshotsService } from './DeviceStatusSnapshots.service';
import { DeviceStatusSnapshots } from './dto/DeviceStatusSnapshots.output';
import { CreateDeviceStatusSnapshotsInput } from './dto/DeviceStatusSnapshots.input';
import { DeviceStatusSnapshotsArgs } from './dto/DeviceStatusSnapshots.args';
import { SmartMeters } from '../SmartMeters/dto/SmartMeters.output';

@Resolver(() => DeviceStatusSnapshots)
export class DeviceStatusSnapshotsResolver {
  constructor(
    private readonly DeviceStatusSnapshotsService: DeviceStatusSnapshotsService,
  ) {}

  @Query(() => [DeviceStatusSnapshots], { name: 'DeviceStatusSnapshotsAll' })
  findAll(@Args() args: DeviceStatusSnapshotsArgs) {
    return this.DeviceStatusSnapshotsService.findAll(args);
  }

  @Query(() => DeviceStatusSnapshots, { name: 'DeviceStatusSnapshots' })
  findOne(@Args('snapshotId', { type: () => Int }) snapshotId: number) {
    return this.DeviceStatusSnapshotsService.findOne(Number(snapshotId));
  }

  @Mutation(() => DeviceStatusSnapshots)
  createDeviceStatusSnapshots(
    @Args('input') input: CreateDeviceStatusSnapshotsInput,
  ) {
    return this.DeviceStatusSnapshotsService.create(input);
  }

  @Mutation(() => DeviceStatusSnapshots)
  updateDeviceStatusSnapshots(
    @Args('snapshotId', { type: () => Int }) snapshotId: number,
    @Args('input') input: CreateDeviceStatusSnapshotsInput,
  ) {
    return this.DeviceStatusSnapshotsService.update(Number(snapshotId), input);
  }

  @Mutation(() => Boolean)
  removeDeviceStatusSnapshots(
    @Args('snapshotId', { type: () => Int }) snapshotId: number,
  ) {
    return this.DeviceStatusSnapshotsService.remove(Number(snapshotId));
  }

  @ResolveField(() => SmartMeters, { nullable: true })
  async smartmeters(
    @Parent() DeviceStatusSnapshots: DeviceStatusSnapshots,
  ): Promise<any | null> {
    const result = await this.DeviceStatusSnapshotsService.findSmartmeters(
      Number(DeviceStatusSnapshots.snapshotId),
    );
    return result[0] || null;
  }
}
