import { ArgsType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ArgsType()
export class DeviceCommandsArgs {
  @Field(() => String, { nullable: true })
  commandId?: string;

  @Field(() => String, { nullable: true })
  meterId?: string;

  @Field(() => String, { nullable: true })
  commandType?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  commandPayload?: string;

  @Field(() => String, { nullable: true })
  correlationId?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  sentAt?: string;

  @Field(() => String, { nullable: true })
  acknowledgedAt?: string;

  @Field(() => String, { nullable: true })
  timeoutAt?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  responsePayload?: string;

  @Field(() => String, { nullable: true })
  errorDetails?: string;

  @Field(() => String, { nullable: true })
  sentByUser?: string;
}
