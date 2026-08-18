import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';
import { SOCIAL_PEDAGOGY_TRIGGER_TYPES } from '../social-pedagogy.util';

export class CreateSocialPedagogyCaseDto {
  @IsString()
  tenantId: string;

  @IsString()
  playerId: string;

  @IsIn([...SOCIAL_PEDAGOGY_TRIGGER_TYPES])
  triggerType: string;

  @IsString()
  @IsOptional()
  triggerLabel?: string;

  @IsString()
  @IsOptional()
  triggerRefType?: string;

  @IsString()
  @IsOptional()
  triggerRefId?: string;

  @IsDateString()
  @IsOptional()
  periodStart?: string;

  @IsDateString()
  @IsOptional()
  periodEnd?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
