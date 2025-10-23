import { InputType, Field, Float } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class CreateEnergyReadingsDetailedInput {
  @Field(() => String)
  meterId: string;

  @Field(() => String)
  timestamp: string;

  @Field(() => String)
  subsystem: string;

  @Field(() => Float, { nullable: true })
  dailyEnergyWh?: number | undefined;

  @Field(() => Float, { nullable: true })
  totalEnergyWh?: number | undefined;

  @Field(() => Float, { nullable: true })
  settlementEnergyWh?: number | undefined;

  @Field(() => Float, { nullable: true })
  currentPowerW?: number | undefined;

  @Field(() => Float, { nullable: true })
  voltage?: number | undefined;

  @Field(() => Float, { nullable: true })
  currentAmp?: number | undefined;

  @Field(() => GraphQLJSON, { nullable: true })
  subsystemData?: string | undefined;

  @Field(() => GraphQLJSON)
  rawPayload: string;
}
