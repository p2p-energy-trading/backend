import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class CreateMarketTradesInput {
  @Field(() => String)
  buyerOrderId: string;

  @Field(() => String)
  sellerOrderId: string;

  @Field(() => String)
  buyerProsumerId: string;

  @Field(() => String)
  sellerProsumerId: string;

  @Field(() => String)
  buyerWalletAddress: string;

  @Field(() => String)
  sellerWalletAddress: string;

  @Field(() => Float)
  tradedEtkAmount: number;

  @Field(() => Float)
  priceIdrsPerEtk: number;

  @Field(() => Float)
  totalIdrsValue: number;

  @Field(() => String, { nullable: true })
  blockchainTxHash?: string | undefined;

  @Field(() => String)
  tradeTimestamp: string;

  @Field(() => Float, { nullable: true })
  gasFeeWei?: number | undefined;

  @Field(() => String)
  createdAt: string;
}
