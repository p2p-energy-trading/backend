import { ObjectType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { SmartMeters } from '../../SmartMeters/dto/SmartMeters.output';
import { Prosumers } from '../../Prosumers/dto/Prosumers.output';

@ObjectType()
export class DeviceCommands {
  @Field(() => String)
  commandId: string;

  @Field(() => String)
  meterId: string;

  @Field(() => String)
  commandType: string;

  @Field(() => GraphQLJSON)
  commandPayload: any;

  @Field(() => String)
  correlationId: string;

  @Field(() => String)
  status: string;

  @Field(() => String)
  sentAt: string;

  @Field(() => String, { nullable: true })
  acknowledgedAt?: string | null;

  @Field(() => String, { nullable: true })
  timeoutAt?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  responsePayload?: any | null;

  @Field(() => String, { nullable: true })
  errorDetails?: string | null;

  @Field(() => String, { nullable: true })
  sentByUser?: string | null;
  @Field(() => SmartMeters, { nullable: true })
  smartmeters?: SmartMeters;

  @Field(() => Prosumers, { nullable: true })
  prosumers?: Prosumers;
}
