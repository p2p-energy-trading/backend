import { InputType, Field, Int, Float } from '@nestjs/graphql';

@InputType()
export class CreateEnergyReadingsInput {
  @Field(() => String)
  meterId: string;

  @Field(() => String)
  timestamp: string;

  @Field(() => Float, { nullable: true })
  voltage?: number | undefined;

  @Field(() => Float, { nullable: true })
  currentAmp?: number | undefined;

  @Field(() => Float, { nullable: true })
  powerKw?: number | undefined;

  @Field(() => String)
  flowDirection: string;

  @Field(() => [Int], { nullable: true })
  smartmetersIds?: number[];
}
