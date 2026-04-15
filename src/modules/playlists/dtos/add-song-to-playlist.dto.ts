import { IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddSongToPlaylistDto {
  @ApiProperty({
    description: 'Song ID to add to playlist',
    example: 1,
  })
  @IsNotEmpty()
  songId: number;

  @ApiProperty({
    description: 'Order index in playlist (optional)',
    example: 1,
    required: false,
  })
  @IsOptional()
  orderIdx?: number;
}
