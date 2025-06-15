import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateSystemConfigInput {
  @Field(() => String)
  configKey: string;

  @Field(() => String)
  configValue: string;

  @Field(() => String, { nullable: true })
  description?: string | undefined;

  @Field(() => String)
  updatedAt: string;

  @Field(() => String, { nullable: true })
  updatedBy?: string | undefined;
}
