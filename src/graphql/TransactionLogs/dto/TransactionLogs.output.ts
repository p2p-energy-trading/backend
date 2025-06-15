import { ObjectType, Field, Float } from '@nestjs/graphql';
import { TradeOrdersCache } from '../../TradeOrdersCache/dto/TradeOrdersCache.output';
import { Prosumers } from '../../Prosumers/dto/Prosumers.output';
import { EnergySettlements } from '../../EnergySettlements/dto/EnergySettlements.output';

@ObjectType()
export class TransactionLogs {
  @Field(() => String)
  logId: string;

  @Field(() => String)
  prosumerId: string;

  @Field(() => String, { nullable: true })
  relatedOrderId?: string | null;

  @Field(() => String, { nullable: true })
  relatedSettlementId?: string | null;

  @Field(() => String)
  transactionType: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Float)
  amountPrimary: number;

  @Field(() => String)
  currencyPrimary: string;

  @Field(() => Float, { nullable: true })
  amountSecondary?: number | null;

  @Field(() => String, { nullable: true })
  currencySecondary?: string | null;

  @Field(() => String, { nullable: true })
  blockchainTxHash?: string | null;

  @Field(() => String)
  transactionTimestamp: string;
  @Field(() => TradeOrdersCache, { nullable: true })
  tradeorderscache?: TradeOrdersCache;

  @Field(() => Prosumers, { nullable: true })
  prosumers?: Prosumers;

  @Field(() => EnergySettlements, { nullable: true })
  energysettlements?: EnergySettlements;
}
