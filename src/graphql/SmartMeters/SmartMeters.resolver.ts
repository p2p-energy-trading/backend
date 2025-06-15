import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { SmartMetersService } from './SmartMeters.service';
import { SmartMeters } from './dto/SmartMeters.output';
import { CreateSmartMetersInput } from './dto/SmartMeters.input';
import { SmartMetersArgs } from './dto/SmartMeters.args';
import { DeviceCommands } from '../DeviceCommands/dto/DeviceCommands.output';
import { DeviceHeartbeats } from '../DeviceHeartbeats/dto/DeviceHeartbeats.output';
import { DeviceStatusSnapshots } from '../DeviceStatusSnapshots/dto/DeviceStatusSnapshots.output';
import { EnergyReadings } from '../EnergyReadings/dto/EnergyReadings.output';
import { EnergyReadingsDetailed } from '../EnergyReadingsDetailed/dto/EnergyReadingsDetailed.output';
import { EnergySettlements } from '../EnergySettlements/dto/EnergySettlements.output';
import { MqttMessageLogs } from '../MqttMessageLogs/dto/MqttMessageLogs.output';
import { Prosumers } from '../Prosumers/dto/Prosumers.output';

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

  @ResolveField(() => [DeviceCommands])
  async devicecommandsList(@Parent() SmartMeters: SmartMeters): Promise<any[]> {
    return this.SmartMetersService.findDevicecommandsList(SmartMeters.meterId);
  }

  @ResolveField(() => [DeviceHeartbeats])
  async deviceheartbeatsList(
    @Parent() SmartMeters: SmartMeters,
  ): Promise<any[]> {
    return this.SmartMetersService.findDeviceheartbeatsList(
      SmartMeters.meterId,
    );
  }

  @ResolveField(() => [DeviceStatusSnapshots])
  async devicestatussnapshotsList(
    @Parent() SmartMeters: SmartMeters,
  ): Promise<any[]> {
    return this.SmartMetersService.findDevicestatussnapshotsList(
      SmartMeters.meterId,
    );
  }

  @ResolveField(() => [EnergyReadings])
  async energyreadingsList(@Parent() SmartMeters: SmartMeters): Promise<any[]> {
    return this.SmartMetersService.findEnergyreadingsList(SmartMeters.meterId);
  }

  @ResolveField(() => [EnergyReadingsDetailed])
  async energyreadingsdetailedList(
    @Parent() SmartMeters: SmartMeters,
  ): Promise<any[]> {
    return this.SmartMetersService.findEnergyreadingsdetailedList(
      SmartMeters.meterId,
    );
  }

  @ResolveField(() => [EnergySettlements])
  async energysettlementsList(
    @Parent() SmartMeters: SmartMeters,
  ): Promise<any[]> {
    return this.SmartMetersService.findEnergysettlementsList(
      SmartMeters.meterId,
    );
  }

  @ResolveField(() => [MqttMessageLogs])
  async mqttmessagelogsList(
    @Parent() SmartMeters: SmartMeters,
  ): Promise<any[]> {
    return this.SmartMetersService.findMqttmessagelogsList(SmartMeters.meterId);
  }

  @ResolveField(() => Prosumers, { nullable: true })
  async prosumers(@Parent() SmartMeters: SmartMeters): Promise<any | null> {
    const result = await this.SmartMetersService.findProsumers(
      SmartMeters.meterId,
    );
    return result[0] || null;
  }
}
