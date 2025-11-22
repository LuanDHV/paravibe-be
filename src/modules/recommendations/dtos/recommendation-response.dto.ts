export class RecommendationResponseDto {
  recId: number;

  songId: number;

  similarSongId: number;

  score: number;

  computedAt: Date;

  songTitle?: string;

  similarSongTitle?: string;

  artistName?: string;

  similarArtistName?: string;
}

export class TopKRecommendationDto {
  songId: number;

  title: string;

  artistName: string;

  genre?: string;

  score: number;
}
