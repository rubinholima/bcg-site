import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import {
  BOSTON_TV_ORIENTATION_LANDSCAPE,
  BOSTON_TV_ORIENTATION_PORTRAIT,
} from '../boston-tv-orientation.constants';

export class PatchBostonTvPlaylistDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn([BOSTON_TV_ORIENTATION_LANDSCAPE, BOSTON_TV_ORIENTATION_PORTRAIT])
  displayOrientation?: string;
}
