import { InputType, Field, Int, Float } from '@nestjs/graphql';

@InputType()
export class CreateIdrsConversionsInput {
  @Field(() => String)
  prosumerId: string;

  @Field(() => String)
  walletAddress: string;

  @Field(() => String)
  conversionType: string;

  @Field(() => Float, { nullable: true })
  idrAmount?: number | undefined;

  @Field(() => Float)
  idrsAmount: number;

  @Field(() => Float, { nullable: true })
  exchangeRate?: number | undefined;

  @Field(() => String, { nullable: true })
  blockchainTxHash?: string | undefined;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  simulationNote?: string | undefined;

  @Field(() => String)
  createdAt: string;

  @Field(() => String, { nullable: true })
  confirmedAt?: string | undefined;

  @Field(() => [Int], { nullable: true })
  prosumersIds?: number[];

  @Field(() => [Int], { nullable: true })
  walletsIds?: number[];
}
