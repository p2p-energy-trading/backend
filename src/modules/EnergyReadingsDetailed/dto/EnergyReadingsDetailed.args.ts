import { ArgsType, Field, Float } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ArgsType()
export class EnergyReadingsDetailedArgs {
  @Field(() => String, { nullable: true })
  readingId?: string;

  @Field(() => String, { nullable: true })
  meterId?: string;

  @Field(() => String, { nullable: true })
  timestamp?: string;

  // Time range filtering for dashboard real-time data
  @Field(() => String, { nullable: true })
  timestampFrom?: string;

  @Field(() => String, { nullable: true })
  timestampTo?: string;

  // Hours-based filtering (e.g., last 1 hour, last 24 hours)
  @Field(() => Float, { nullable: true })
  lastHours?: number;

  @Field(() => String, { nullable: true })
  subsystem?: string;

  @Field(() => Float, { nullable: true })
  dailyEnergyWh?: number;

  @Field(() => Float, { nullable: true })
  totalEnergyWh?: number;

  @Field(() => Float, { nullable: true })
  settlementEnergyWh?: number;

  @Field(() => Float, { nullable: true })
  currentPowerW?: number;

  @Field(() => Float, { nullable: true })
  voltage?: number;

  @Field(() => Float, { nullable: true })
  currentAmp?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  subsystemData?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  rawPayload?: string;
}
