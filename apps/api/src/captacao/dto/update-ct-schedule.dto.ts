import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';
import { CT_SCHEDULE_STATUSES, type CtScheduleStatus } from '../captacao.constants';

export class UpdateCtScheduleDto {
  @IsOptional()
  @IsIn([...CT_SCHEDULE_STATUSES])
  ctScheduleStatus?: CtScheduleStatus;

  @IsOptional()
  @IsISO8601()
  ctScheduledAt?: string;

  @IsOptional()
  @IsString()
  ctScheduleNotes?: string;

  @IsOptional()
  @IsString()
  presentationDate?: string;
}
