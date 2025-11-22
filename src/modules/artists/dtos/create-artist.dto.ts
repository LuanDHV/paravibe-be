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
}
