import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTenantKindDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
