import { SongResponseDto } from './song-response.dto';

export class TrendingSongResponseDto extends SongResponseDto {
  playCount: number;
  totalDuration: number;
}
