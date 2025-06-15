import { InputType, Field, Int, Float } from '@nestjs/graphql';

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

  @Field(() => [Int], { nullable: true })
  prosumersIds?: number[];

  @Field(() => [Int], { nullable: true })
  walletsIds?: number[];

  @Field(() => [Int], { nullable: true })
  prosumers2Ids?: number[];

  @Field(() => [Int], { nullable: true })
  wallets2Ids?: number[];
}
