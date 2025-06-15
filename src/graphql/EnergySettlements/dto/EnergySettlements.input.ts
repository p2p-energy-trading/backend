import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class CreateEnergySettlementsInput {
  @Field(() => String)
  meterId: string;

  @Field(() => String)
  periodStartTime: string;

  @Field(() => String)
  periodEndTime: string;

  @Field(() => Float)
  netKwhFromGrid: number;

  @Field(() => Float, { nullable: true })
  etkAmountCredited?: number | undefined;

  @Field(() => String, { nullable: true })
  blockchainTxHash?: string | undefined;

  @Field(() => String)
  status: string;

  @Field(() => String)
  createdAtBackend: string;

  @Field(() => String, { nullable: true })
  confirmedAtOnChain?: string | undefined;

  @Field(() => String)
  settlementTrigger: string;

  @Field(() => Float, { nullable: true })
  rawExportKwh?: number | undefined;

  @Field(() => Float, { nullable: true })
  rawImportKwh?: number | undefined;

  @Field(() => String, { nullable: true })
  validationStatus?: string | undefined;

  @Field(() => String, { nullable: true })
  settlementDataSource?: string | undefined;

  @Field(() => GraphQLJSON, { nullable: true })
  detailedEnergyBreakdown?: any | undefined;

  @Field(() => String, { nullable: true })
  mqttMessageId?: string | undefined;

  @Field(() => [Int], { nullable: true })
  smartmetersIds?: number[];

  @Field(() => [Int], { nullable: true })
  mqttmessagelogsIds?: number[];
}
