import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateVisitingTeamDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  logoUrl?: string;
}
