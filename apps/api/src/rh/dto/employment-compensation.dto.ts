import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { COMPENSATION_KINDS } from '../employment-compensation.constants';

export class CreateEmploymentCompensationItemDto {
  @IsString()
  @IsIn([...COMPENSATION_KINDS])
  kind!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  legalDocumentId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEmploymentCompensationItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @IsOptional()
  @IsString()
  legalDocumentId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CloseEmploymentCompensationItemDto {
  @IsDateString()
  effectiveTo!: string;
}

export class CreateEmploymentSalaryRevisionDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateEmploymentBankDataDto {
  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  agency?: string;

  @IsOptional()
  @IsString()
  account?: string;

  @IsOptional()
  @IsString()
  accountType?: string;

  @IsOptional()
  @IsString()
  operation?: string;

  @IsOptional()
  @IsString()
  pix?: string;

  @IsOptional()
  @IsString()
  pixKeyType?: string;

  @IsOptional()
  @IsString()
  holderName?: string;

  @IsOptional()
  @IsString()
  holderCpf?: string;
}
