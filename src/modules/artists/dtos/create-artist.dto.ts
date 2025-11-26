import { IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateArtistDto {
  @ApiProperty({
    description: 'Artist name',
    example: 'Queen',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Artist country',
    example: 'United Kingdom',
    required: false,
  })
  @IsOptional()
  country?: string;

  @ApiProperty({
    description: 'Artist biography',
    example: 'American singer-songwriter',
    required: false,
  })
  @IsOptional()
  bio?: string;

  @ApiProperty({
    description: 'Artist genre',
    example: 'Pop',
    required: false,
  })
  @IsOptional()
  genre?: string;

  @ApiProperty({
    description: 'Artist image URL',
    example: 'https://example.com/artist.jpg',
    required: false,
  })
  @IsOptional()
  imageUrl?: string;
}
