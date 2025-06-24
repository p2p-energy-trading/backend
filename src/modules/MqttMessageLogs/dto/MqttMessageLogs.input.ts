import { InputType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class CreateMqttMessageLogsInput {
  @Field(() => String)
  meterId: string;

  @Field(() => String)
  topicType: string;

  @Field(() => String)
  direction: string;

  @Field(() => String)
  mqttTopic: string;

  @Field(() => GraphQLJSON)
  payload: string;

  @Field(() => String, { nullable: true })
  rawMessage?: string | undefined;

  @Field(() => String)
  messageTimestamp: string;

  @Field(() => String, { nullable: true })
  processedAt?: string | undefined;

  @Field(() => String, { nullable: true })
  processingStatus?: string | undefined;

  @Field(() => String, { nullable: true })
  errorMessage?: string | undefined;

  @Field(() => String, { nullable: true })
  correlationId?: string | undefined;
}
