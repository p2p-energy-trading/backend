import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class TradeOrdersCache {
  @Field(() => String)
  orderId: string;

  @Field(() => String)
  prosumerId: string;

  @Field(() => String)
  walletAddress: string;

  @Field(() => String)
  orderType: string;

  @Field(() => String)
  pair: string;

  @Field(() => Float)
  amountEtk: number;

  @Field(() => Float)
  priceIdrsPerEtk: number;

  @Field(() => Float, { nullable: true })
  totalIdrsValue?: number | null;

  @Field(() => String)
  statusOnChain: string;

  @Field(() => String)
  createdAtOnChain: string;

  @Field(() => String)
  updatedAtCache: string;

  @Field(() => String, { nullable: true })
  blockchainTxHashPlaced?: string | null;

  @Field(() => String, { nullable: true })
  blockchainTxHashFilled?: string | null;
}
