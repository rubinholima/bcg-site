import { IsOptional, IsString } from 'class-validator';

export class TryoutSupervisionValidateDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
