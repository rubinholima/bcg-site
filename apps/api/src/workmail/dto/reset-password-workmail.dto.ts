import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordWorkmailDto {
  @IsString()
  @IsNotEmpty({ message: 'workmailOrganizationId é obrigatório' })
  workmailOrganizationId: string;

  @IsString()
  @IsNotEmpty({ message: 'workmailUserId é obrigatório' })
  workmailUserId: string;

  @IsString()
  @IsNotEmpty({ message: 'newPassword é obrigatória' })
  @MinLength(8, { message: 'Nova senha deve ter no mínimo 8 caracteres' })
  newPassword: string;
}
