import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreateEmployeeDocumentDto {
  @IsString()
  employeeId: string;

  @IsString()
  @IsOptional()
  employmentId?: string;

  @IsString()
  @MaxLength(64)
  documentType: string;

  @IsString()
  @IsOptional()
  fileKey?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
