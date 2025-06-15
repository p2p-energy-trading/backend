import { ObjectType, Field } from '@nestjs/graphql';
import { BlockchainApprovals } from '../../BlockchainApprovals/dto/BlockchainApprovals.output';
import { IdrsConversions } from '../../IdrsConversions/dto/IdrsConversions.output';
import { MarketTrades } from '../../MarketTrades/dto/MarketTrades.output';
import { TradeOrdersCache } from '../../TradeOrdersCache/dto/TradeOrdersCache.output';
import { Prosumers } from '../../Prosumers/dto/Prosumers.output';

@ObjectType()
export class Wallets {
  @Field(() => String)
  walletAddress: string;

  @Field(() => String)
  prosumerId: string;

  @Field(() => String, { nullable: true })
  walletName?: string | null;

  @Field(() => String, { nullable: true })
  encryptedPrivateKey?: string | null;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  importMethod: string;

  @Field(() => String)
  isActive: boolean;

  @Field(() => String, { nullable: true })
  lastUsedAt?: string | null;
  @Field(() => [BlockchainApprovals], { nullable: true })
  blockchainapprovalsList?: BlockchainApprovals[];

  @Field(() => [IdrsConversions], { nullable: true })
  idrsconversionsList?: IdrsConversions[];

  @Field(() => [MarketTrades], { nullable: true })
  markettradesList?: MarketTrades[];

  @Field(() => [MarketTrades], { nullable: true })
  markettradesList2?: MarketTrades[];

  @Field(() => [TradeOrdersCache], { nullable: true })
  tradeorderscacheList?: TradeOrdersCache[];

  @Field(() => Prosumers, { nullable: true })
  prosumers?: Prosumers;
}
