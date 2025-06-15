import { ObjectType, Field, Float } from '@nestjs/graphql';
import { Prosumers } from '../../Prosumers/dto/Prosumers.output';
import { Wallets } from '../../Wallets/dto/Wallets.output';
import { TransactionLogs } from '../../TransactionLogs/dto/TransactionLogs.output';

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
  @Field(() => Prosumers, { nullable: true })
  prosumers?: Prosumers;

  @Field(() => Wallets, { nullable: true })
  wallets?: Wallets;

  @Field(() => [TransactionLogs], { nullable: true })
  transactionlogsList?: TransactionLogs[];
}
