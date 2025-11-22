import { IsOptional, IsNotEmpty } from 'class-validator';

export class CreateSongDto {
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  artistId: number;

  @IsOptional()
  genre?: string;

  @IsOptional()
  previewUrl?: string;

  @IsOptional()
  lyrics?: string;

  @IsOptional()
  audioVector?: number[];

  @IsOptional()
  lyricVector?: number[];
}
