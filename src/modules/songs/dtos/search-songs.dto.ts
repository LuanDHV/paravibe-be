import { IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchSongsDto {
  @ApiProperty({
    description: 'Search query for song title or lyrics',
    example: 'bohemian',
    required: false,
  })
  @IsOptional()
  q?: string;

  @ApiProperty({
    description: 'Filter by artist ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  artistId?: number;

  @ApiProperty({
    description: 'Filter by genre',
    example: 'Rock',
    required: false,
  })
  @IsOptional()
  genre?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
  })
  @IsOptional()
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
  })
  @IsOptional()
  limit?: number;
}
