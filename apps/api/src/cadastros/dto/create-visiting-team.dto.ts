import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateVisitingTeamDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  logoUrl?: string;
}
