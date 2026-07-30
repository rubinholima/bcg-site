import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CreateLogisticsLookupDto } from './create-logistics-lookup.dto';

export class CreateLogisticsLoyaltyProgramDto extends CreateLogisticsLookupDto {
  @IsOptional()
  @IsString()
  transportCompanyId?: string;
}

export class UpdateLogisticsLoyaltyProgramDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  transportCompanyId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
