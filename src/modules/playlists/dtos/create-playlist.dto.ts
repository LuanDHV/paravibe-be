import { IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlaylistDto {
  @ApiProperty({
    description: 'Playlist name',
    example: 'My Favorite Songs',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Playlist description',
    example: 'A collection of my favorite tracks',
    required: false,
  })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the playlist is public',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  isPublic?: boolean;
}
