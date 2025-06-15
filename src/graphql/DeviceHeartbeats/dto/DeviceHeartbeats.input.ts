import { InputType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class CreateDeviceHeartbeatsInput {
  @Field(() => String)
  meterId: string;

  @Field(() => String)
  timestamp: string;

  @Field(() => String, { nullable: true })
  uptimeSeconds?: string | undefined;

  @Field(() => String, { nullable: true })
  freeHeapBytes?: string | undefined;

  @Field(() => Int, { nullable: true })
  signalStrength?: number | undefined;

  @Field(() => GraphQLJSON, { nullable: true })
  additionalMetrics?: any | undefined;

  @Field(() => [Int], { nullable: true })
  smartmetersIds?: number[];
}
