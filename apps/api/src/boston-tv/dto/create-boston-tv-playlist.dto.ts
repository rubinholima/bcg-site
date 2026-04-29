import { IsString, MinLength } from 'class-validator';

export class CreateBostonTvPlaylistDto {
  @IsString()
  @MinLength(1)
  tenantId!: string;

  @IsString()
  @MinLength(1)
  name!: string;
}
