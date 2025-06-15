import { ArgsType, Field, Float } from '@nestjs/graphql';

@ArgsType()
export class BlockchainApprovalsArgs {
  @Field(() => String, { nullable: true })
  approvalId?: string;

  @Field(() => String, { nullable: true })
  prosumerId?: string;

  @Field(() => String, { nullable: true })
  walletAddress?: string;

  @Field(() => String, { nullable: true })
  spenderContractAddress?: string;

  @Field(() => String, { nullable: true })
  tokenContractAddress?: string;

  @Field(() => Float, { nullable: true })
  approvedAmount?: number;

  @Field(() => String, { nullable: true })
  approvalTxHash?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  expiresAt?: string;

  @Field(() => String, { nullable: true })
  createdAt?: string;

  @Field(() => String, { nullable: true })
  confirmedAt?: string;
}
