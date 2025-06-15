import { ObjectType, Field, Float } from '@nestjs/graphql';
import { SmartMeters } from '../../SmartMeters/dto/SmartMeters.output';

@ObjectType()
export class EnergyReadings {
  @Field(() => String)
  readingId: string;

  @Field(() => String)
  meterId: string;

  @Field(() => String)
  timestamp: string;

  @Field(() => Float, { nullable: true })
  voltage?: number | null;

  @Field(() => Float, { nullable: true })
  currentAmp?: number | null;

  @Field(() => Float, { nullable: true })
  powerKw?: number | null;

  @Field(() => String)
  flowDirection: string;
  @Field(() => SmartMeters, { nullable: true })
  smartmeters?: SmartMeters;
}
