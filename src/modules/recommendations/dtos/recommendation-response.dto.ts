import { ApiProperty } from '@nestjs/swagger';

export class RecommendationResponseDto {
  @ApiProperty({
    description: 'Recommendation record ID',
    example: 1,
  })
  recId: number;

  @ApiProperty({
    description: 'Original song ID',
    example: 1,
  })
  songId: number;

  @ApiProperty({
    description: 'Similar song ID',
    example: 2,
  })
  similarSongId: number;

  @ApiProperty({
    description: 'Similarity score',
    example: 0.85,
  })
  score: number;

  @ApiProperty({
    description: 'Timestamp when recommendation was computed',
    example: '2023-01-01T00:00:00.000Z',
  })
  computedAt: Date;

  @ApiProperty({
    description: 'Original song title',
    example: 'Bohemian Rhapsody',
    required: false,
  })
  songTitle?: string;

  @ApiProperty({
    description: 'Similar song title',
    example: 'Stairway to Heaven',
    required: false,
  })
  similarSongTitle?: string;

  @ApiProperty({
    description: 'Original song artist name',
    example: 'Queen',
    required: false,
  })
  artistName?: string;

  @ApiProperty({
    description: 'Similar song artist name',
    example: 'Led Zeppelin',
    required: false,
  })
  similarArtistName?: string;
}

export class TopKRecommendationDto {
  @ApiProperty({
    description: 'Song ID',
    example: 1,
  })
  songId: number;

  @ApiProperty({
    description: 'Song title',
    example: 'Bohemian Rhapsody',
  })
  title: string;

  @ApiProperty({
    description: 'Artist name',
    example: 'Queen',
  })
  artistName: string;

  @ApiProperty({
    description: 'Song genre',
    example: 'Rock',
    required: false,
  })
  genre?: string;

  @ApiProperty({
    description: 'Recommendation score',
    example: 0.85,
  })
  score: number;
}
