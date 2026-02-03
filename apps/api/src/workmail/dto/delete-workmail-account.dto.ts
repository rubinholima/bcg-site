import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteWorkmailAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'workmailOrganizationId é obrigatório' })
  workmailOrganizationId: string;

  @IsString()
  @IsNotEmpty({ message: 'workmailUserId é obrigatório' })
  workmailUserId: string;
}
