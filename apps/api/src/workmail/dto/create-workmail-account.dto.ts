import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateWorkmailAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'workmailOrganizationId é obrigatório' })
  workmailOrganizationId: string;

  @IsString()
  @IsNotEmpty({ message: 'domain é obrigatório' })
  @MaxLength(253)
  domain: string;

  @IsString()
  @IsNotEmpty({ message: 'localPart é obrigatório' })
  @MaxLength(64)
  localPart: string;

  @IsString()
  @IsNotEmpty({ message: 'displayName é obrigatório' })
  @MaxLength(256)
  displayName: string;

  @IsString()
  @IsNotEmpty({ message: 'initialPassword é obrigatória' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  initialPassword: string;
}
