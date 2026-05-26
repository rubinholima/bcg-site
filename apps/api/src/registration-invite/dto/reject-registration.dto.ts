import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectRegistrationDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
