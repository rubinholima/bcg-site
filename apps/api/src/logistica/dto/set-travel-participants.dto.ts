import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class TravelParticipantItemDto {
  @IsIn(['player', 'staff', 'guest'])
  personType!: 'player' | 'staff' | 'guest';

  @ValidateIf((o: TravelParticipantItemDto) => o.personType === 'player')
  @IsString()
  playerId?: string;

  @ValidateIf((o: TravelParticipantItemDto) => o.personType === 'staff')
  @IsString()
  staffId?: string;

  @ValidateIf((o: TravelParticipantItemDto) => o.personType === 'guest' && !o.logisticsGuestId)
  @IsString()
  @MaxLength(200)
  guestName?: string;

  @ValidateIf((o: TravelParticipantItemDto) => o.personType === 'guest')
  @IsOptional()
  @IsString()
  logisticsGuestId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  guestDocument?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/** Substitui a lista completa de convocados da viagem (atletas, staff e convidados). */
export class SetTravelParticipantsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TravelParticipantItemDto)
  participants!: TravelParticipantItemDto[];
}
