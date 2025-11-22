import { IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSongDto {
  @ApiProperty({
    description: 'Song title',
    example: 'Bohemian Rhapsody',
  })
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Artist ID',
    example: 1,
  })
  @IsNotEmpty()
  artistId: number;

  @ApiProperty({
    description: 'Song genre',
    example: 'Rock',
    required: false,
  })
  @IsOptional()
  genre?: string;

  @ApiProperty({
    description: 'Preview URL for the song',
    example: 'https://example.com/preview.mp3',
    required: false,
  })
  @IsOptional()
  previewUrl?: string;

  @ApiProperty({
    description: 'Song lyrics',
    example: 'Is this the real life...',
    required: false,
  })
  @IsOptional()
  lyrics?: string;

  @ApiProperty({
    description: 'Audio feature vector for recommendations',
    type: [Number],
    example: [0.1, 0.2, 0.3],
    required: false,
  })
  @IsOptional()
  audioVector?: number[];

  @ApiProperty({
    description: 'Lyric feature vector for recommendations',
    type: [Number],
    example: [0.4, 0.5, 0.6],
    required: false,
  })
  @IsOptional()
  lyricVector?: number[];
}
