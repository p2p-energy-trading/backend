import { ObjectType, Field, Float } from '@nestjs/graphql';
import { Prosumers } from '../../Prosumers/dto/Prosumers.output';
import { Wallets } from '../../Wallets/dto/Wallets.output';

@ObjectType()
export class IdrsConversions {
  @Field(() => String)
  conversionId: string;

  @Field(() => String)
  prosumerId: string;

  @Field(() => String)
  walletAddress: string;

  @Field(() => String)
  conversionType: string;

  @Field(() => Float, { nullable: true })
  idrAmount?: number | null;

  @Field(() => Float)
  idrsAmount: number;

  @Field(() => Float, { nullable: true })
  exchangeRate?: number | null;

  @Field(() => String, { nullable: true })
  blockchainTxHash?: string | null;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  simulationNote?: string | null;

  @Field(() => String)
  createdAt: string;

  @Field(() => String, { nullable: true })
  confirmedAt?: string | null;
  @Field(() => Prosumers, { nullable: true })
  prosumers?: Prosumers;

  @Field(() => Wallets, { nullable: true })
  wallets?: Wallets;
}
