import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  TRYOUT_COACH_OUTCOMES,
  TRYOUT_COACH_RATING_MAX,
  TRYOUT_COACH_RATING_MIN,
} from '../tryout-workflow.constants';

export class CreateTryoutCoachEvaluationDto {
  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;

  @IsNumber()
  @Min(TRYOUT_COACH_RATING_MIN)
  @Max(TRYOUT_COACH_RATING_MAX)
  technicalRating!: number;

  @IsNumber()
  @Min(TRYOUT_COACH_RATING_MIN)
  @Max(TRYOUT_COACH_RATING_MAX)
  physicalRating!: number;

  @IsNumber()
  @Min(TRYOUT_COACH_RATING_MIN)
  @Max(TRYOUT_COACH_RATING_MAX)
  tacticalRating!: number;

  @IsNumber()
  @Min(TRYOUT_COACH_RATING_MIN)
  @Max(TRYOUT_COACH_RATING_MAX)
  cognitiveRating!: number;

  @IsString()
  descriptiveObservation!: string;

  @IsIn([...TRYOUT_COACH_OUTCOMES])
  outcome!: (typeof TRYOUT_COACH_OUTCOMES)[number];

  @IsString()
  justification!: string;
}
