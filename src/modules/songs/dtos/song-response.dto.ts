export class SongResponseDto {
  songId: number;
  title: string;
  artist: {
    artistId: number;
    name: string;
  };
  genre: string;
  previewUrl: string;
  lyrics: string;
  audioVector?: number[];
  lyricVector?: number[];
  createdAt: Date;
}
