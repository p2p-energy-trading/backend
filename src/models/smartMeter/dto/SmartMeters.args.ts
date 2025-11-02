import { ArgsType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ArgsType()
export class SmartMetersArgs {
  @Field(() => String, { nullable: true })
  meterId?: string;

  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => String, { nullable: true })
  meterBlockchainAddress?: string;

  @Field(() => String, { nullable: true })
  location?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  createdAt?: string;

  @Field(() => String, { nullable: true })
  lastSeen?: string;

  @Field(() => String, { nullable: true })
  updatedAt?: string;

  @Field(() => String, { nullable: true })
  mqttTopicRealtime?: string;

  @Field(() => String, { nullable: true })
  mqttTopicSettlement?: string;

  @Field(() => Int, { nullable: true })
  settlementIntervalMinutes?: number;

  @Field(() => String, { nullable: true })
  firmwareVersion?: string;

  @Field(() => String, { nullable: true })
  lastSettlementAt?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  deviceConfiguration?: string;

  @Field(() => String, { nullable: true })
  lastHeartbeatAt?: string;

  @Field(() => String, { nullable: true })
  deviceModel?: string;

  @Field(() => String, { nullable: true })
  deviceVersion?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  capabilities?: string;
}
