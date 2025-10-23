import { ArgsType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ArgsType()
export class DeviceStatusSnapshotsArgs {
  @Field(() => String, { nullable: true })
  snapshotId?: string;

  @Field(() => String, { nullable: true })
  meterId?: string;

  @Field(() => String, { nullable: true })
  timestamp?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  wifiStatus?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  mqttStatus?: string;

  @Field(() => String, { nullable: true })
  gridMode?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  systemStatus?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  componentStatus?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  rawPayload?: string;
}
