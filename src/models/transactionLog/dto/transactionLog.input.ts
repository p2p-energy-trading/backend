import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class CreateTransactionLogsInput {
  @Field(() => String)
  userId: string;

  @Field(() => String, { nullable: true })
  relatedOrderId?: string | undefined;

  @Field(() => String, { nullable: true })
  relatedSettlementId?: number | undefined;

  @Field(() => String)
  transactionType: string;

  @Field(() => String, { nullable: true })
  description?: string | undefined;

  @Field(() => Float)
  amountPrimary: number;

  @Field(() => String)
  currencyPrimary: string;

  @Field(() => Float, { nullable: true })
  amountSecondary?: number | undefined;

  @Field(() => String, { nullable: true })
  currencySecondary?: string | undefined;

  @Field(() => String, { nullable: true })
  blockchainTxHash?: string | undefined;

  @Field(() => String)
  transactionTimestamp: string;
}
