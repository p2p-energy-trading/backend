import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { DeviceCommands } from '../../DeviceCommands/dto/DeviceCommands.output';
import { DeviceHeartbeats } from '../../DeviceHeartbeats/dto/DeviceHeartbeats.output';
import { DeviceStatusSnapshots } from '../../DeviceStatusSnapshots/dto/DeviceStatusSnapshots.output';
import { EnergyReadings } from '../../EnergyReadings/dto/EnergyReadings.output';
import { EnergyReadingsDetailed } from '../../EnergyReadingsDetailed/dto/EnergyReadingsDetailed.output';
import { EnergySettlements } from '../../EnergySettlements/dto/EnergySettlements.output';
import { MqttMessageLogs } from '../../MqttMessageLogs/dto/MqttMessageLogs.output';
import { Prosumers } from '../../Prosumers/dto/Prosumers.output';

@ObjectType()
export class SmartMeters {
  @Field(() => String)
  meterId: string;

  @Field(() => String)
  prosumerId: string;

  @Field(() => String, { nullable: true })
  meterBlockchainAddress?: string | null;

  @Field(() => String, { nullable: true })
  location?: string | null;

  @Field(() => String, { nullable: true })
  status?: string | null;

  @Field(() => String)
  createdAt: string;

  @Field(() => String, { nullable: true })
  lastSeen?: string | null;

  @Field(() => String)
  updatedAt: string;

  @Field(() => String, { nullable: true })
  mqttTopicRealtime?: string | null;

  @Field(() => String, { nullable: true })
  mqttTopicSettlement?: string | null;

  @Field(() => Int, { nullable: true })
  settlementIntervalMinutes?: number | null;

  @Field(() => String, { nullable: true })
  firmwareVersion?: string | null;

  @Field(() => String, { nullable: true })
  lastSettlementAt?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  deviceConfiguration?: any | null;

  @Field(() => String, { nullable: true })
  lastHeartbeatAt?: string | null;

  @Field(() => String, { nullable: true })
  deviceModel?: string | null;

  @Field(() => String, { nullable: true })
  deviceVersion?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  capabilities?: any | null;
  @Field(() => [DeviceCommands], { nullable: true })
  devicecommandsList?: DeviceCommands[];

  @Field(() => [DeviceHeartbeats], { nullable: true })
  deviceheartbeatsList?: DeviceHeartbeats[];

  @Field(() => [DeviceStatusSnapshots], { nullable: true })
  devicestatussnapshotsList?: DeviceStatusSnapshots[];

  @Field(() => [EnergyReadings], { nullable: true })
  energyreadingsList?: EnergyReadings[];

  @Field(() => [EnergyReadingsDetailed], { nullable: true })
  energyreadingsdetailedList?: EnergyReadingsDetailed[];

  @Field(() => [EnergySettlements], { nullable: true })
  energysettlementsList?: EnergySettlements[];

  @Field(() => [MqttMessageLogs], { nullable: true })
  mqttmessagelogsList?: MqttMessageLogs[];

  @Field(() => Prosumers, { nullable: true })
  prosumers?: Prosumers;
}
