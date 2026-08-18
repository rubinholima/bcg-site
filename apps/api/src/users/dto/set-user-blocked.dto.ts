import { IsBoolean } from 'class-validator';

export class SetUserBlockedDto {
  @IsBoolean()
  blocked!: boolean;
}
