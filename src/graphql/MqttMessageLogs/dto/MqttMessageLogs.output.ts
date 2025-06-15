import { ObjectType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { EnergySettlements } from '../../EnergySettlements/dto/EnergySettlements.output';
import { SmartMeters } from '../../SmartMeters/dto/SmartMeters.output';

@ObjectType()
export class MqttMessageLogs {
  @Field(() => String)
  logId: string;

  @Field(() => String)
  meterId: string;

  @Field(() => String)
  topicType: string;

  @Field(() => String)
  direction: string;

  @Field(() => String)
  mqttTopic: string;

  @Field(() => GraphQLJSON)
  payload: any;

  @Field(() => String, { nullable: true })
  rawMessage?: string | null;

  @Field(() => String)
  messageTimestamp: string;

  @Field(() => String, { nullable: true })
  processedAt?: string | null;

  @Field(() => String, { nullable: true })
  processingStatus?: string | null;

  @Field(() => String, { nullable: true })
  errorMessage?: string | null;

  @Field(() => String, { nullable: true })
  correlationId?: string | null;
  @Field(() => [EnergySettlements], { nullable: true })
  energysettlementsList?: EnergySettlements[];

  @Field(() => SmartMeters, { nullable: true })
  smartmeters?: SmartMeters;
}
