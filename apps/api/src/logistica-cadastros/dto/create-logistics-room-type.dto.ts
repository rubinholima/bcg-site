import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CreateLogisticsLookupDto } from './create-logistics-lookup.dto';

export class CreateLogisticsRoomTypeDto extends CreateLogisticsLookupDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class UpdateLogisticsRoomTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
