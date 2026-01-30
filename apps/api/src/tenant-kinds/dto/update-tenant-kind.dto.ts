import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateTenantKindDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;
}
