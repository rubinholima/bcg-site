import { IsOptional, IsString } from 'class-validator';

export class TryoutResponsibleCoachDto {
  @IsString()
  staffId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
