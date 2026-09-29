import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class ProposeCtDto {
  @IsISO8601()
  proposedCtAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
