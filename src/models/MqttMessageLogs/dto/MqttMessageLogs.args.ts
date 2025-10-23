import { ArgsType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ArgsType()
export class MqttMessageLogsArgs {
  @Field(() => String, { nullable: true })
  logId?: string;

  @Field(() => String, { nullable: true })
  meterId?: string;

  @Field(() => String, { nullable: true })
  topicType?: string;

  @Field(() => String, { nullable: true })
  direction?: string;

  @Field(() => String, { nullable: true })
  mqttTopic?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  payload?: string;

  @Field(() => String, { nullable: true })
  rawMessage?: string;

  @Field(() => String, { nullable: true })
  messageTimestamp?: string;

  @Field(() => String, { nullable: true })
  processedAt?: string;

  @Field(() => String, { nullable: true })
  processingStatus?: string;

  @Field(() => String, { nullable: true })
  errorMessage?: string;

  @Field(() => String, { nullable: true })
  correlationId?: string;
}
