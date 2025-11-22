import {
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsEnum,
  IsPositive,
} from 'class-validator';

export enum HistoryAction {
  PLAY = 'PLAY',
  SKIP = 'SKIP',
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

export class CreateHistoryDto {
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  songId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  durationListened?: number;

  @IsOptional()
  @IsEnum(HistoryAction)
  action?: HistoryAction;
}
