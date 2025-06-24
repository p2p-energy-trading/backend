import { InputType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class CreateDeviceCommandsInput {
  @Field(() => String)
  meterId: string;

  @Field(() => String)
  commandType: string;

  @Field(() => GraphQLJSON)
  commandPayload: string;

  @Field(() => String)
  correlationId: string;

  @Field(() => String)
  status: string;

  @Field(() => String)
  sentAt: string;

  @Field(() => String, { nullable: true })
  acknowledgedAt?: string | undefined;

  @Field(() => String, { nullable: true })
  timeoutAt?: string | undefined;

  @Field(() => GraphQLJSON, { nullable: true })
  responsePayload?: string | undefined;

  @Field(() => String, { nullable: true })
  errorDetails?: string | undefined;

  @Field(() => String, { nullable: true })
  sentByUser?: string | undefined;
}
