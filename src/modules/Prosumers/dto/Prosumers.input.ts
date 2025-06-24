import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateProsumersInput {
  @Field(() => String)
  prosumerId: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  passwordHash: string;

  @Field(() => String, { nullable: true })
  name?: string | undefined;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  updatedAt: string;
}
