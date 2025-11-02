import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class SmartMeters {
  @Field(() => String)
  meterId: string;

  @Field(() => String)
  userId: string;

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
  deviceConfiguration?: string | null;

  @Field(() => String, { nullable: true })
  lastHeartbeatAt?: string | null;

  @Field(() => String, { nullable: true })
  deviceModel?: string | null;

  @Field(() => String, { nullable: true })
  deviceVersion?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  capabilities?: string | null;
}
