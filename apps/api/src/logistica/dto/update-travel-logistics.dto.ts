import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsObject,
  IsIn,
  IsBoolean,
  IsArray,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTravelLogisticsDto {
  @IsString()
  @IsOptional()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  categories?: string[];

  @IsDateString()
  @IsOptional()
  matchDate?: string;

  @IsBoolean()
  @IsOptional()
  isHomeMatch?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  opponentName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  stadiumName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  country?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  championshipName?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  distanceKm?: number;

  @IsString()
  @IsOptional()
  @IsIn(['aereo_comercial', 'aereo_fretado', 'rodoviario', 'misto'])
  transportType?: string;

  @IsString()
  @IsOptional()
  transportDetails?: string;

  @IsDateString()
  @IsOptional()
  estimatedDeparture?: string;

  @IsDateString()
  @IsOptional()
  estimatedArrival?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  hotelName?: string;

  @IsString()
  @IsOptional()
  hotelAddress?: string;

  @IsOptional()
  accommodationRooms?: unknown; // Array<{ roomNumber, occupants }>

  @IsObject()
  @IsOptional()
  mealPlan?: unknown;

  @IsDateString()
  @IsOptional()
  nutritionApprovedAt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  nutritionApprovedBy?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  estimatedCostTotal?: number;

  @IsObject()
  @IsOptional()
  estimatedCostBreakdown?: Record<string, number>;

  @IsString()
  @IsOptional()
  @IsIn(['rascunho', 'planejamento', 'aprovado', 'em_andamento', 'concluido', 'cancelado'])
  status?: string;

  @IsString()
  @IsOptional()
  weatherForecast?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @IsObject()
  logisticsCadastros?: Record<string, string | null | undefined>;

  @IsOptional()
  @IsArray()
  expenseLines?: Array<{
    id?: string;
    expenseCategoryId?: string | null;
    serviceProductId?: string | null;
    supplierId?: string | null;
    paymentTypeId?: string | null;
    description?: string;
    amount?: number | null;
  }>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pointOfInterestIds?: string[];
}
