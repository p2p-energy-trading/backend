import { InputType, Field, Int, Float } from '@nestjs/graphql';

@InputType()
export class CreateTransactionLogsInput {
  @Field(() => String)
  prosumerId: string;

  @Field(() => String, { nullable: true })
  relatedOrderId?: string | undefined;

  @Field(() => String, { nullable: true })
  relatedSettlementId?: string | undefined;

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

  @Field(() => [Int], { nullable: true })
  tradeorderscacheIds?: number[];

  @Field(() => [Int], { nullable: true })
  prosumersIds?: number[];

  @Field(() => [Int], { nullable: true })
  energysettlementsIds?: number[];
}
