import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class CreateBlockchainApprovalsInput {
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
  approvalTxHash?: string | undefined;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  expiresAt?: string | undefined;

  @Field(() => String)
  createdAt: string;

  @Field(() => String, { nullable: true })
  confirmedAt?: string | undefined;
}
