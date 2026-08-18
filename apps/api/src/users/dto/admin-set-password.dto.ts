import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminSetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Nova senha deve ter no mínimo 8 caracteres' })
  password!: string;

  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;
}
