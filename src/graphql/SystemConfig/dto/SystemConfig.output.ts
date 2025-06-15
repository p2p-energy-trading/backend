import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class SystemConfig {
  @Field(() => String)
  configKey: string;

  @Field(() => String)
  configValue: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String)
  updatedAt: string;

  @Field(() => String, { nullable: true })
  updatedBy?: string | null;
}
