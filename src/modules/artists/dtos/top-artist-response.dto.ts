import { ArtistResponseDto } from './artist-response.dto';

export class TopArtistResponseDto extends ArtistResponseDto {
  playCount: number;
  totalDuration: number;
  songCount: number;
}
