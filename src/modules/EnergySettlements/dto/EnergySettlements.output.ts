import { ObjectType, Field, Float } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { SmartMeters } from '../../SmartMeters/dto/SmartMeters.output';
import { MqttMessageLogs } from '../../MqttMessageLogs/dto/MqttMessageLogs.output';
import { TransactionLogs } from '../../TransactionLogs/dto/TransactionLogs.output';

@ObjectType()
export class EnergySettlements {
  @Field(() => String)
  settlementId: string;

  @Field(() => String)
  meterId: string;

  @Field(() => String)
  periodStartTime: string;

  @Field(() => String)
  periodEndTime: string;

  @Field(() => Float)
  netKwhFromGrid: number;

  @Field(() => Float, { nullable: true })
  etkAmountCredited?: number | null;

  @Field(() => String, { nullable: true })
  blockchainTxHash?: string | null;

  @Field(() => String)
  status: string;

  @Field(() => String)
  createdAtBackend: string;

  @Field(() => String, { nullable: true })
  confirmedAtOnChain?: string | null;

  @Field(() => String)
  settlementTrigger: string;

  @Field(() => Float, { nullable: true })
  rawExportKwh?: number | null;

  @Field(() => Float, { nullable: true })
  rawImportKwh?: number | null;

  @Field(() => String, { nullable: true })
  validationStatus?: string | null;

  @Field(() => String, { nullable: true })
  settlementDataSource?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  detailedEnergyBreakdown?: any | null;

  @Field(() => String, { nullable: true })
  mqttMessageId?: string | null;
  @Field(() => SmartMeters, { nullable: true })
  smartmeters?: SmartMeters;

  @Field(() => MqttMessageLogs, { nullable: true })
  mqttmessagelogs?: MqttMessageLogs;

  @Field(() => [TransactionLogs], { nullable: true })
  transactionlogsList?: TransactionLogs[];
}
