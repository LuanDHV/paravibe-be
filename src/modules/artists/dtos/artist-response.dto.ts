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
}
