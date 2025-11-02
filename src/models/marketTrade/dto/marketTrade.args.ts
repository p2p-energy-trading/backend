import { ArgsType, Field, Float } from '@nestjs/graphql';

@ArgsType()
export class MarketTradesArgs {
  @Field(() => String, { nullable: true })
  tradeId?: string;

  @Field(() => String, { nullable: true })
  buyerOrderId?: string;

  @Field(() => String, { nullable: true })
  sellerOrderId?: string;

  @Field(() => String, { nullable: true })
  buyerUserId?: string;

  @Field(() => String, { nullable: true })
  sellerUserId?: string;

  @Field(() => String, { nullable: true })
  buyerWalletAddress?: string;

  @Field(() => String, { nullable: true })
  sellerWalletAddress?: string;

  @Field(() => Float, { nullable: true })
  tradedEtkAmount?: number;

  @Field(() => Float, { nullable: true })
  priceIdrsPerEtk?: number;

  @Field(() => Float, { nullable: true })
  totalIdrsValue?: number;

  @Field(() => String, { nullable: true })
  blockchainTxHash?: string;

  @Field(() => String, { nullable: true })
  tradeTimestamp?: string;

  @Field(() => Float, { nullable: true })
  gasFeeWei?: number;

  @Field(() => String, { nullable: true })
  createdAt?: string;
}
