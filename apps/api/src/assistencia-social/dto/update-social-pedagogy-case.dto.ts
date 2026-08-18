import { IsString, IsOptional, IsDateString, IsIn, IsBoolean } from 'class-validator';
import { SOCIAL_PEDAGOGY_CASE_STATUSES } from '../social-pedagogy.util';

export class UpdateSocialPedagogyCaseDto {
  @IsIn([...SOCIAL_PEDAGOGY_CASE_STATUSES])
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  periodStart?: string;

  @IsDateString()
  @IsOptional()
  periodEnd?: string;

  @IsString()
  @IsOptional()
  schoolNotificationText?: string;

  @IsDateString()
  @IsOptional()
  schoolNotificationSentAt?: string;

  @IsString()
  @IsOptional()
  schoolNotificationChannel?: string;

  @IsString()
  @IsOptional()
  schoolResponseNotes?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  refreshAgenda?: boolean;

  @IsOptional()
  @IsBoolean()
  refreshContactValidation?: boolean;
}
