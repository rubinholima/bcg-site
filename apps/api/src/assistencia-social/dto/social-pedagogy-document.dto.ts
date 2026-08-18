import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';
import { SOCIAL_PEDAGOGY_DOCUMENT_TYPES } from '../social-pedagogy.util';

export class CreateSocialPedagogyDocumentDto {
  @IsString()
  playerId: string;

  @IsString()
  @IsOptional()
  caseId?: string;

  @IsIn([...SOCIAL_PEDAGOGY_DOCUMENT_TYPES])
  documentType: string;

  @IsString()
  name: string;

  @IsString()
  fileUrl: string;

  @IsString()
  @IsOptional()
  schoolYear?: string;

  @IsString()
  @IsOptional()
  period?: string;

  @IsDateString()
  @IsOptional()
  receivedAt?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSocialPedagogyDocumentDto {
  @IsIn([...SOCIAL_PEDAGOGY_DOCUMENT_TYPES])
  @IsOptional()
  documentType?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  schoolYear?: string;

  @IsString()
  @IsOptional()
  period?: string;

  @IsDateString()
  @IsOptional()
  receivedAt?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
