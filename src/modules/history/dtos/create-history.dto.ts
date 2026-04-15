import {
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsEnum,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum HistoryAction {
  PLAY = 'PLAY',
  SKIP = 'SKIP',
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

export class CreateHistoryDto {
  @ApiProperty({
    description: 'Song ID',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  songId: number;

  @ApiProperty({
    description: 'Timestamp when the song was played',
    example: '2024-11-22T10:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  playedAt?: string;

  @ApiProperty({
    description: 'Duration listened in seconds',
    example: 180,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  durationListened?: number;

  @ApiProperty({
    description: 'User action',
    enum: HistoryAction,
    example: HistoryAction.PLAY,
    required: false,
  })
  @IsOptional()
  @IsEnum(HistoryAction)
  action?: HistoryAction;
}
