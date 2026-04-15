import { ApiProperty } from '@nestjs/swagger';
import { HistoryAction } from './create-history.dto';

export class HistoryResponseDto {
  @ApiProperty({
    description: 'History record ID',
    example: 1,
  })
  historyId: number;

  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'Song ID',
    example: 1,
  })
  songId: number;

  @ApiProperty({
    description: 'Timestamp when the song was listened',
    example: '2023-01-01T00:00:00.000Z',
  })
  listenedAt: Date;

  @ApiProperty({
    description: 'Duration listened in seconds',
    example: 180,
    required: false,
  })
  durationListened?: number;

  @ApiProperty({
    description: 'User action',
    enum: HistoryAction,
    example: HistoryAction.PLAY,
    required: false,
  })
  action?: HistoryAction;

  @ApiProperty({
    description: 'Song title',
    example: 'Bohemian Rhapsody',
    required: false,
  })
  songTitle?: string;

  @ApiProperty({
    description: 'Artist name',
    example: 'Queen',
    required: false,
  })
  artistName?: string;
}
