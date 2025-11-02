import { ArgsType, Field, Float } from '@nestjs/graphql';

@ArgsType()
export class IdrsConversionsArgs {
  @Field(() => String, { nullable: true })
  conversionId?: string;

  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => String, { nullable: true })
  walletAddress?: string;

  @Field(() => String, { nullable: true })
  conversionType?: string;

  @Field(() => Float, { nullable: true })
  idrAmount?: number;

  @Field(() => Float, { nullable: true })
  idrsAmount?: number;

  @Field(() => Float, { nullable: true })
  exchangeRate?: number;

  @Field(() => String, { nullable: true })
  blockchainTxHash?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  simulationNote?: string;

  @Field(() => String, { nullable: true })
  createdAt?: string;

  @Field(() => String, { nullable: true })
  confirmedAt?: string;
}
