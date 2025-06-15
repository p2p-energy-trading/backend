import { InputType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class CreateDeviceStatusSnapshotsInput {
  @Field(() => String)
  meterId: string;

  @Field(() => String)
  timestamp: string;

  @Field(() => GraphQLJSON, { nullable: true })
  wifiStatus?: any | undefined;

  @Field(() => GraphQLJSON, { nullable: true })
  mqttStatus?: any | undefined;

  @Field(() => String, { nullable: true })
  gridMode?: string | undefined;

  @Field(() => GraphQLJSON, { nullable: true })
  systemStatus?: any | undefined;

  @Field(() => GraphQLJSON, { nullable: true })
  componentStatus?: any | undefined;

  @Field(() => GraphQLJSON)
  rawPayload: any;

  @Field(() => [Int], { nullable: true })
  smartmetersIds?: number[];
}
