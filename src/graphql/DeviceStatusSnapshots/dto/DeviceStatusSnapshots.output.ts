import { ObjectType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { SmartMeters } from '../../SmartMeters/dto/SmartMeters.output';

@ObjectType()
export class DeviceStatusSnapshots {
  @Field(() => String)
  snapshotId: string;

  @Field(() => String)
  meterId: string;

  @Field(() => String)
  timestamp: string;

  @Field(() => GraphQLJSON, { nullable: true })
  wifiStatus?: any | null;

  @Field(() => GraphQLJSON, { nullable: true })
  mqttStatus?: any | null;

  @Field(() => String, { nullable: true })
  gridMode?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  systemStatus?: any | null;

  @Field(() => GraphQLJSON, { nullable: true })
  componentStatus?: any | null;

  @Field(() => GraphQLJSON)
  rawPayload: any;
  @Field(() => SmartMeters, { nullable: true })
  smartmeters?: SmartMeters;
}
