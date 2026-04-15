import { ApiProperty } from '@nestjs/swagger';

export class ArtistResponseDto {
  @ApiProperty({
    description: 'Artist ID',
    example: 1,
  })
  artistId: number;

  @ApiProperty({
    description: 'Artist name',
    example: 'Queen',
  })
  name: string;

  @ApiProperty({
    description: 'Artist country',
    example: 'United Kingdom',
    required: false,
  })
  country?: string;

  @ApiProperty({
    description: 'Artist biography',
    example: 'American singer-songwriter',
    required: false,
  })
  bio?: string;

  @ApiProperty({
    description: 'Artist genre',
    example: 'Pop',
    required: false,
  })
  genre?: string;

  @ApiProperty({
    description: 'Artist image URL',
    example: 'https://example.com/artist.jpg',
    required: false,
  })
  imageUrl?: string;
}
