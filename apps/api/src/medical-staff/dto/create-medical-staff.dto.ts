import { IsOptional, IsString, IsIn } from 'class-validator';

const ROLES = ['medico', 'enfermeiro', 'enfermeiro_tec', 'fisioterapeuta', 'nutricionista', 'fisiologista', 'massagista', 'outro'] as const;

export class CreateMedicalStaffDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(ROLES)
  role: string;

  @IsOptional()
  @IsString()
  crmCoren?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}
