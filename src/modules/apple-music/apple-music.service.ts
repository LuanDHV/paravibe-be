import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { appleMusicConfig } from '../../config/apple-music.config';

/**
 * iTunes Search API Response Types
 */
export interface ItunesTrack {
  wrapperType: string;
  kind: string;
  artistId: number;
  collectionId: number;
  trackId: number;
  artistName: string;
  collectionName: string;
  trackName: string;
  collectionCensoredName: string;
  trackCensoredName: string;
  artistViewUrl: string;
  collectionViewUrl: string;
  trackViewUrl: string;
  previewUrl: string; // Audio preview URL (30s mp3)
  artworkUrl30: string;
  artworkUrl60: string;
  artworkUrl100: string;
  collectionPrice?: number;
  trackPrice?: number;
  releaseDate: string;
  collectionExplicitness: string;
  trackExplicitness: string;
  discCount: number;
  discNumber: number;
  trackCount: number;
  trackNumber: number;
  trackTimeMillis: number; // Duration in milliseconds
  country: string;
  currency: string;
  primaryGenreName: string;
  isStreamable: boolean;
}

export interface ItunesSearchResponse {
  resultCount: number;
  results: ItunesTrack[];
}

@Injectable()
export class AppleMusicService {
  private readonly logger = new Logger(AppleMusicService.name);
  private itunesApi: AxiosInstance;

  constructor() {
    this.itunesApi = axios.create({
      baseURL: appleMusicConfig.apiBaseUrl,
      timeout: 10000,
    });
  }

  async searchTracks(term: string, limit = 50): Promise<ItunesTrack[]> {
    try {
      const response = await this.itunesApi.get<ItunesSearchResponse>(
        appleMusicConfig.searchEndpoint,
        {
          params: {
            term,
            media: appleMusicConfig.defaults.media,
            entity: appleMusicConfig.defaults.entity,
            limit,
            country: appleMusicConfig.defaults.country,
          },
        },
      );

      this.logger.debug(
        `Found ${response.data.resultCount} tracks for term: "${term}"`,
      );
      return response.data.results;
    } catch (error) {
      this.logger.error(
        `Failed to search tracks for term: "${term}"`,
        (error as Error).message,
      );
      return [];
    }
  }

  async searchByGenre(genre: string, limit = 50): Promise<ItunesTrack[]> {
    // iTunes Search API doesn't have direct genre search
    // We search by genre keyword to get relevant tracks
    return this.searchTracks(genre, limit);
  }

  async getTrendingTracks(
    year: number,
    genre: string,
    limit = 50,
  ): Promise<ItunesTrack[]> {
    try {
      // Search with genre + year for better relevance
      const searchTerm = `${genre} ${year}`;
      const tracks = await this.searchTracks(searchTerm, limit);

      // Filter tracks released in the specified year
      const filteredTracks = tracks.filter((track) => {
        const releaseYear = new Date(track.releaseDate).getFullYear();
        return releaseYear === year || releaseYear === year - 1;
      });

      // If not enough tracks from the year, return all results
      return filteredTracks.length >= 10 ? filteredTracks : tracks;
    } catch (error) {
      this.logger.error(
        `Failed to get trending tracks for ${genre} (${year})`,
        (error as Error).message,
      );
      return [];
    }
  }

  async getTracksAcrossGenres(
    genres: string[],
    tracksPerGenre = 25,
  ): Promise<ItunesTrack[]> {
    const allTracks: ItunesTrack[] = [];

    this.logger.log(
      `Fetching ${genres.length} genres × ${tracksPerGenre} tracks...`,
    );

    for (const genre of genres) {
      try {
        const tracks = await this.searchByGenre(genre, tracksPerGenre);
        allTracks.push(...tracks);

        // Rate limiting: Wait 200ms between requests
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        this.logger.warn(
          `Failed to fetch tracks for genre: ${genre}`,
          (error as Error).message,
        );
      }
    }

    this.logger.log(`Total tracks fetched: ${allTracks.length}`);
    return allTracks;
  }

  hasValidPreview(track: ItunesTrack): boolean {
    return !!track.previewUrl && track.previewUrl.startsWith('https://');
  }

  filterTracksWithPreview(tracks: ItunesTrack[]): ItunesTrack[] {
    const filtered = tracks.filter((track) => this.hasValidPreview(track));
    this.logger.debug(
      `Filtered ${filtered.length}/${tracks.length} tracks with valid preview URLs`,
    );
    return filtered;
  }

  async downloadPreview(previewUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get<Buffer>(previewUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(
        `Failed to download preview: ${previewUrl}`,
        (error as Error).message,
      );
      throw error;
    }
  }
}
