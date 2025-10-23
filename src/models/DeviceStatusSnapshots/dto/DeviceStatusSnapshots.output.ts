import { ObjectType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class DeviceStatusSnapshots {
  @Field(() => String)
  snapshotId: string;

  @Field(() => String)
  meterId: string;

  @Field(() => String)
  timestamp: string;

  @Field(() => GraphQLJSON, { nullable: true })
  wifiStatus?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  mqttStatus?: string | null;

  @Field(() => String, { nullable: true })
  gridMode?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  systemStatus?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  componentStatus?: string | null;

  @Field(() => GraphQLJSON)
  rawPayload: string;
}
