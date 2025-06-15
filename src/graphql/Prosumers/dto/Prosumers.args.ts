import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class ProsumersArgs {
  @Field(() => String, { nullable: true })
  prosumerId?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  passwordHash?: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  createdAt?: string;

  @Field(() => String, { nullable: true })
  updatedAt?: string;
}
