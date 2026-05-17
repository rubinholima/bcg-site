import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  IsDateString,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { ASSET_PIECE_TYPES } from '../asset-piece-types';

export class CreateAssetDto {
  @IsString()
  tenantId: string;

  @IsString()
  categoryId: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  tagNumber?: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  photoUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  responsibleName?: string;

  @IsDateString()
  @IsOptional()
  acquisitionDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  acquisitionValue?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  depreciationRate?: number;

  @IsString()
  @IsOptional()
  @IsIn(['em_uso', 'em_manutencao', 'emprestado', 'baixado'])
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  // Kit uniforme (quando category.kind = uniform)
  @IsString()
  @IsOptional()
  @IsIn([...ASSET_PIECE_TYPES])
  pieceType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  size?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(99)
  shirtNumber?: number;

  @IsString()
  @IsOptional()
  assignedPlayerId?: string;
}
