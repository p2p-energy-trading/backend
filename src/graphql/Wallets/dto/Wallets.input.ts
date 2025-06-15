import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateWalletsInput {
  @Field(() => String)
  walletAddress: string;

  @Field(() => String)
  prosumerId: string;

  @Field(() => String, { nullable: true })
  walletName?: string | undefined;

  @Field(() => String, { nullable: true })
  encryptedPrivateKey?: string | undefined;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  importMethod: string;

  @Field(() => String)
  isActive: boolean;

  @Field(() => String, { nullable: true })
  lastUsedAt?: string | undefined;

  @Field(() => [Int], { nullable: true })
  prosumersIds?: number[];
}
