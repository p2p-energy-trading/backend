import { InputType, Field, Int, Float } from '@nestjs/graphql';

@InputType()
export class CreateTradeOrdersCacheInput {
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
  totalIdrsValue?: number | undefined;

  @Field(() => String)
  statusOnChain: string;

  @Field(() => String)
  createdAtOnChain: string;

  @Field(() => String)
  updatedAtCache: string;

  @Field(() => String, { nullable: true })
  blockchainTxHashPlaced?: string | undefined;

  @Field(() => String, { nullable: true })
  blockchainTxHashFilled?: string | undefined;

  @Field(() => [Int], { nullable: true })
  prosumersIds?: number[];

  @Field(() => [Int], { nullable: true })
  walletsIds?: number[];

}
