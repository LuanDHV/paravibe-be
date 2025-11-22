import {
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsEnum,
  IsPositive,
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
