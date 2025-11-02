import { InputType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class CreateSmartMetersInput {
  @Field(() => String)
  meterId: string;

  @Field(() => String)
  userId: string;

  @Field(() => String, { nullable: true })
  meterBlockchainAddress?: string | undefined;

  @Field(() => String, { nullable: true })
  location?: string | undefined;

  @Field(() => String, { nullable: true })
  status?: string | undefined;

  @Field(() => String)
  createdAt: string;

  @Field(() => String, { nullable: true })
  lastSeen?: string | undefined;

  @Field(() => String)
  updatedAt: string;

  @Field(() => String, { nullable: true })
  mqttTopicRealtime?: string | undefined;

  @Field(() => String, { nullable: true })
  mqttTopicSettlement?: string | undefined;

  @Field(() => Int, { nullable: true })
  settlementIntervalMinutes?: number | undefined;

  @Field(() => String, { nullable: true })
  firmwareVersion?: string | undefined;

  @Field(() => String, { nullable: true })
  lastSettlementAt?: string | undefined;

  @Field(() => GraphQLJSON, { nullable: true })
  deviceConfiguration?: string | undefined;

  @Field(() => String, { nullable: true })
  lastHeartbeatAt?: string | undefined;

  @Field(() => String, { nullable: true })
  deviceModel?: string | undefined;

  @Field(() => String, { nullable: true })
  deviceVersion?: string | undefined;

  @Field(() => GraphQLJSON, { nullable: true })
  capabilities?: string | undefined;

  @Field(() => [Int], { nullable: true })
  prosumersIds?: number[];
}
