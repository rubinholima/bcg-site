import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateStadiumDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  city?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
