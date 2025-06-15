import { ArgsType, Field, Float } from '@nestjs/graphql';

@ArgsType()
export class TradeOrdersCacheArgs {
  @Field(() => String, { nullable: true })
  orderId?: string;

  @Field(() => String, { nullable: true })
  prosumerId?: string;

  @Field(() => String, { nullable: true })
  walletAddress?: string;

  @Field(() => String, { nullable: true })
  orderType?: string;

  @Field(() => String, { nullable: true })
  pair?: string;

  @Field(() => Float, { nullable: true })
  amountEtk?: number;

  @Field(() => Float, { nullable: true })
  priceIdrsPerEtk?: number;

  @Field(() => Float, { nullable: true })
  totalIdrsValue?: number;

  @Field(() => String, { nullable: true })
  statusOnChain?: string;

  @Field(() => String, { nullable: true })
  createdAtOnChain?: string;

  @Field(() => String, { nullable: true })
  updatedAtCache?: string;

  @Field(() => String, { nullable: true })
  blockchainTxHashPlaced?: string;

  @Field(() => String, { nullable: true })
  blockchainTxHashFilled?: string;
}
