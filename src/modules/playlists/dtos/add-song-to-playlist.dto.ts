import { IsNotEmpty, IsOptional } from 'class-validator';

export class AddSongToPlaylistDto {
  @IsNotEmpty()
  songId: number;

  @IsOptional()
  orderIdx?: number;
}
