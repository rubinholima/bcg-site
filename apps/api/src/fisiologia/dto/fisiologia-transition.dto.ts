import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePhysioTransitionProgramEntryDto {
  @IsString()
  sessionDate!: string;

  @IsString()
  workType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  workTypeLabel?: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  activities?: string;

  @IsOptional()
  @IsString()
  evolutionNote?: string;

  @IsBoolean()
  stillFeelsPain!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  evolutionScore?: number;

  @IsBoolean()
  needsNewSession!: boolean;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  staffName?: string;
}

export class ListPhysioTransitionProgramsQuery {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['active', 'completed', 'cancelled'])
  status?: 'active' | 'completed' | 'cancelled';
}
