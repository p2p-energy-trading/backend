import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class IdrsConversions {
  @Field(() => String)
  conversionId: string;

  @Field(() => String)
  userId: string;

  @Field(() => String)
  walletAddress: string;

  @Field(() => String)
  conversionType: string;

  @Field(() => Float, { nullable: true })
  idrAmount?: number | null;

  @Field(() => Float)
  idrsAmount: number;

  @Field(() => Float, { nullable: true })
  exchangeRate?: number | null;

  @Field(() => String, { nullable: true })
  blockchainTxHash?: string | null;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  simulationNote?: string | null;

  @Field(() => String)
  createdAt: string;

  @Field(() => String, { nullable: true })
  confirmedAt?: string | null;
}
