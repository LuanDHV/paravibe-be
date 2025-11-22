import { HistoryAction } from './create-history.dto';

export class HistoryResponseDto {
  historyId: number;

  userId: number;

  songId: number;

  listenedAt: Date;

  durationListened?: number;

  action?: HistoryAction;

  songTitle?: string;

  artistName?: string;
}
