import { ApiProperty } from '@nestjs/swagger';

export class PlaylistResponseDto {
  @ApiProperty({
    description: 'Playlist ID',
    example: 1,
  })
  playlistId: number;

  @ApiProperty({
    description: 'User ID who owns the playlist',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'Playlist name',
    example: 'My Favorite Songs',
  })
  name: string;

  @ApiProperty({
    description: 'Playlist description',
    example: 'A collection of my favorite tracks',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Whether the playlist is public',
    example: true,
  })
  isPublic: boolean;

  @ApiProperty({
    description: 'Playlist creation timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Songs in the playlist',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        songId: { type: 'number', example: 1 },
        title: { type: 'string', example: 'Bohemian Rhapsody' },
        artistName: { type: 'string', example: 'Queen' },
        genre: { type: 'string', example: 'Rock' },
      },
    },
    required: false,
  })
  songs?: Array<{
    songId: number;
    title: string;
    artistName: string;
    genre?: string;
  }>;
}
