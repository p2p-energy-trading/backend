import { InputType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class CreateDeviceStatusSnapshotsInput {
  @Field(() => String)
  meterId: string;

  @Field(() => String)
  timestamp: string;

  @Field(() => GraphQLJSON, { nullable: true })
  wifiStatus?: string | undefined;

  @Field(() => GraphQLJSON, { nullable: true })
  mqttStatus?: string | undefined;

  @Field(() => String, { nullable: true })
  gridMode?: string | undefined;

  @Field(() => GraphQLJSON, { nullable: true })
  systemStatus?: string | undefined;

  @Field(() => GraphQLJSON, { nullable: true })
  componentStatus?: string | undefined;

  @Field(() => GraphQLJSON)
  rawPayload: string;

  @Field(() => [Int], { nullable: true })
  smartmetersIds?: number[];
}
