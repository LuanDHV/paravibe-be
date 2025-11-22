export interface AIRecommendationResponse {
  recommendations: Array<{
    song_id: number;
    score: number;
  }>;
}

export interface AIRecomputeResponse {
  count: number;
}
