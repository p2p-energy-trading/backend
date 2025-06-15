import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class WalletsArgs {
  @Field(() => String, { nullable: true })
  walletAddress?: string;

  @Field(() => String, { nullable: true })
  prosumerId?: string;

  @Field(() => String, { nullable: true })
  walletName?: string;

  @Field(() => String, { nullable: true })
  encryptedPrivateKey?: string;

  @Field(() => String, { nullable: true })
  createdAt?: string;

  @Field(() => String, { nullable: true })
  importMethod?: string;

  @Field(() => String, { nullable: true })
  isActive?: boolean;

  @Field(() => String, { nullable: true })
  lastUsedAt?: string;
}
