import { ApiProperty } from '@nestjs/swagger';

export class SongResponseDto {
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
    description: 'Artist information',
    type: 'object',
    properties: {
      artistId: { type: 'number', example: 1 },
      name: { type: 'string', example: 'Queen' },
    },
  })
  artist: {
    artistId: number;
    name: string;
  };

  @ApiProperty({
    description: 'Song genre',
    example: 'Rock',
  })
  genre: string;

  @ApiProperty({
    description: 'Preview URL for the song',
    example: 'https://example.com/preview.mp3',
  })
  previewUrl: string;

  @ApiProperty({
    description: 'Song lyrics',
    example: 'Is this the real life...',
  })
  lyrics: string;

  @ApiProperty({
    description: 'Audio feature vector for recommendations',
    type: [Number],
    example: [0.1, 0.2, 0.3],
    required: false,
  })
  audioVector?: number[];

  @ApiProperty({
    description: 'Lyric feature vector for recommendations',
    type: [Number],
    example: [0.4, 0.5, 0.6],
    required: false,
  })
  lyricVector?: number[];

  @ApiProperty({
    description: 'Song creation timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}
