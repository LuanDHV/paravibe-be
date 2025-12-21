export interface AIRecommendationResponse {
  song: {
    song_id: number;
    title: string;
    artist: string;
  };
  recommendations: Array<{
    song_id: number;
    title: string;
    artist: string;
    score: number;
  }>;
  processing_time: number;
}

export interface AIRecomputeResponse {
  count: number;
}
