import { ObjectType, Field, Float } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class EnergyReadingsDetailed {
  @Field(() => String)
  readingId: string;

  @Field(() => String)
  meterId: string;

  @Field(() => String)
  timestamp: string;

  @Field(() => String)
  subsystem: string;

  @Field(() => Float, { nullable: true })
  dailyEnergyWh?: number | null;

  @Field(() => Float, { nullable: true })
  totalEnergyWh?: number | null;

  @Field(() => Float, { nullable: true })
  settlementEnergyWh?: number | null;

  @Field(() => Float, { nullable: true })
  currentPowerW?: number | null;

  @Field(() => Float, { nullable: true })
  voltage?: number | null;

  @Field(() => Float, { nullable: true })
  currentAmp?: number | null;

  @Field(() => GraphQLJSON, { nullable: true })
  subsystemData?: string | null;

  @Field(() => GraphQLJSON)
  rawPayload: string;
}
