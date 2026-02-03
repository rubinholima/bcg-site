import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class EnableWorkmailAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'workmailOrganizationId é obrigatório' })
  workmailOrganizationId: string;

  @IsString()
  @IsNotEmpty({ message: 'workmailUserId é obrigatório' })
  workmailUserId: string;

  @IsString()
  @IsNotEmpty({ message: 'email é obrigatório' })
  @IsEmail({}, { message: 'email deve ser um endereço válido' })
  email: string;
}
