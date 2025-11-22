import { IsOptional } from 'class-validator';

export class SearchSongsDto {
  @IsOptional()
  q?: string;

  @IsOptional()
  artistId?: number;

  @IsOptional()
  genre?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
