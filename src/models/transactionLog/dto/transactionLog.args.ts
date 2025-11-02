import { ArgsType, Field, Float } from '@nestjs/graphql';

@ArgsType()
export class TransactionLogsArgs {
  @Field(() => String, { nullable: true })
  logId?: string;

  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => String, { nullable: true })
  relatedOrderId?: string;

  @Field(() => String, { nullable: true })
  relatedSettlementId?: string;

  @Field(() => String, { nullable: true })
  transactionType?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Float, { nullable: true })
  amountPrimary?: number;

  @Field(() => String, { nullable: true })
  currencyPrimary?: string;

  @Field(() => Float, { nullable: true })
  amountSecondary?: number;

  @Field(() => String, { nullable: true })
  currencySecondary?: string;

  @Field(() => String, { nullable: true })
  blockchainTxHash?: string;

  @Field(() => String, { nullable: true })
  transactionTimestamp?: string;
}
