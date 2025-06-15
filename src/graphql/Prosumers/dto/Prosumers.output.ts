import { ObjectType, Field } from '@nestjs/graphql';
import { BlockchainApprovals } from '../../BlockchainApprovals/dto/BlockchainApprovals.output';
import { DeviceCommands } from '../../DeviceCommands/dto/DeviceCommands.output';
import { IdrsConversions } from '../../IdrsConversions/dto/IdrsConversions.output';
import { MarketTrades } from '../../MarketTrades/dto/MarketTrades.output';
import { SmartMeters } from '../../SmartMeters/dto/SmartMeters.output';
import { TradeOrdersCache } from '../../TradeOrdersCache/dto/TradeOrdersCache.output';
import { TransactionLogs } from '../../TransactionLogs/dto/TransactionLogs.output';
import { Wallets } from '../../Wallets/dto/Wallets.output';

@ObjectType()
export class Prosumers {
  @Field(() => String)
  prosumerId: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  passwordHash: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  updatedAt: string;
  @Field(() => [BlockchainApprovals], { nullable: true })
  blockchainapprovalsList?: BlockchainApprovals[];

  @Field(() => [DeviceCommands], { nullable: true })
  devicecommandsList?: DeviceCommands[];

  @Field(() => [IdrsConversions], { nullable: true })
  idrsconversionsList?: IdrsConversions[];

  @Field(() => [MarketTrades], { nullable: true })
  markettradesList?: MarketTrades[];

  @Field(() => [MarketTrades], { nullable: true })
  markettradesList2?: MarketTrades[];

  @Field(() => [SmartMeters], { nullable: true })
  smartmetersList?: SmartMeters[];

  @Field(() => [TradeOrdersCache], { nullable: true })
  tradeorderscacheList?: TradeOrdersCache[];

  @Field(() => [TransactionLogs], { nullable: true })
  transactionlogsList?: TransactionLogs[];

  @Field(() => [Wallets], { nullable: true })
  walletsList?: Wallets[];
}
