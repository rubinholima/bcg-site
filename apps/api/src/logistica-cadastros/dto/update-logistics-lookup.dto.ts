import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateLogisticsLookupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
