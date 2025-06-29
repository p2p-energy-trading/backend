import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class BlockchainApprovals {
  @Field(() => String)
  approvalId: string;

  @Field(() => String)
  prosumerId: string;

  @Field(() => String)
  walletAddress: string;

  @Field(() => String)
  spenderContractAddress: string;

  @Field(() => String)
  tokenContractAddress: string;

  @Field(() => Float)
  approvedAmount: number;

  @Field(() => String, { nullable: true })
  approvalTxHash?: string | null;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  expiresAt?: string | null;

  @Field(() => String)
  createdAt: string;

  @Field(() => String, { nullable: true })
  confirmedAt?: string | null;
}
