import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class SubmittedDocumentDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  documentType: string;

  @IsOptional()
  @IsString()
  fileKey?: string;

  @IsString()
  fileUrl: string;

  @IsString()
  uploadedAt: string;
}

export class SubmittedDocumentsMixin {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmittedDocumentDto)
  documents?: SubmittedDocumentDto[];
}
