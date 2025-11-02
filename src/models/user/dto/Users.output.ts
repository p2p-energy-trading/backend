import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class Prosumers {
  @Field(() => String)
  userId: string;

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
}
