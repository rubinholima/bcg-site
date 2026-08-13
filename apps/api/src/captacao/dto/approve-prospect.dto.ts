import { IsOptional, IsString } from 'class-validator';

export class ApproveProspectDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PromoteProspectDto {
  @IsOptional()
  @IsString()
  playerId?: string;
}
