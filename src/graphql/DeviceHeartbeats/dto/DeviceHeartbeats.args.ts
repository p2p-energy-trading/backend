import { ArgsType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ArgsType()
export class DeviceHeartbeatsArgs {
  @Field(() => String, { nullable: true })
  heartbeatId?: string;

  @Field(() => String, { nullable: true })
  meterId?: string;

  @Field(() => String, { nullable: true })
  timestamp?: string;

  @Field(() => String, { nullable: true })
  uptimeSeconds?: string;

  @Field(() => String, { nullable: true })
  freeHeapBytes?: string;

  @Field(() => Int, { nullable: true })
  signalStrength?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  additionalMetrics?: any;
}
