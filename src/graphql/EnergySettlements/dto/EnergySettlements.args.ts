import { ArgsType, Field, Float } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ArgsType()
export class EnergySettlementsArgs {
  @Field(() => String, { nullable: true })
  settlementId?: string;

  @Field(() => String, { nullable: true })
  meterId?: string;

  @Field(() => String, { nullable: true })
  periodStartTime?: string;

  @Field(() => String, { nullable: true })
  periodEndTime?: string;

  @Field(() => Float, { nullable: true })
  netKwhFromGrid?: number;

  @Field(() => Float, { nullable: true })
  etkAmountCredited?: number;

  @Field(() => String, { nullable: true })
  blockchainTxHash?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  createdAtBackend?: string;

  @Field(() => String, { nullable: true })
  confirmedAtOnChain?: string;

  @Field(() => String, { nullable: true })
  settlementTrigger?: string;

  @Field(() => Float, { nullable: true })
  rawExportKwh?: number;

  @Field(() => Float, { nullable: true })
  rawImportKwh?: number;

  @Field(() => String, { nullable: true })
  validationStatus?: string;

  @Field(() => String, { nullable: true })
  settlementDataSource?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  detailedEnergyBreakdown?: any;

  @Field(() => String, { nullable: true })
  mqttMessageId?: string;
}
