import { ObjectType, Field } from '@nestjs/graphql';

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
}
