import { ArgsType, Field, Float } from '@nestjs/graphql';

@ArgsType()
export class EnergyReadingsArgs {
  @Field(() => String, { nullable: true })
  readingId?: string;

  @Field(() => String, { nullable: true })
  meterId?: string;

  @Field(() => String, { nullable: true })
  timestamp?: string;

  @Field(() => Float, { nullable: true })
  voltage?: number;

  @Field(() => Float, { nullable: true })
  currentAmp?: number;

  @Field(() => Float, { nullable: true })
  powerKw?: number;

  @Field(() => String, { nullable: true })
  flowDirection?: string;
}
