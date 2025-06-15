import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class SystemConfigArgs {
  @Field(() => String, { nullable: true })
  configKey?: string;

  @Field(() => String, { nullable: true })
  configValue?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  updatedAt?: string;

  @Field(() => String, { nullable: true })
  updatedBy?: string;
}
