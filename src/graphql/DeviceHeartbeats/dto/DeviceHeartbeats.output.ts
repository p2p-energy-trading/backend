import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { SmartMeters } from '../../SmartMeters/dto/SmartMeters.output';

@ObjectType()
export class DeviceHeartbeats {
  @Field(() => String)
  heartbeatId: string;

  @Field(() => String)
  meterId: string;

  @Field(() => String)
  timestamp: string;

  @Field(() => String, { nullable: true })
  uptimeSeconds?: string | null;

  @Field(() => String, { nullable: true })
  freeHeapBytes?: string | null;

  @Field(() => Int, { nullable: true })
  signalStrength?: number | null;

  @Field(() => GraphQLJSON, { nullable: true })
  additionalMetrics?: any | null;
  @Field(() => SmartMeters, { nullable: true })
  smartmeters?: SmartMeters;
}
