/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios from 'axios';
import type { AxiosInstance } from 'axios';

interface SpotifyAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: {
    images: Array<{ url: string; height: number; width: number }>;
    name: string;
    release_date: string;
  };
  duration_ms: number;
  preview_url: string | null;
  popularity: number;
  external_urls: {
    spotify: string;
  };
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
    next: string | null;
    total: number;
  };
}

interface SpotifyAudioFeatures {
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
  tempo: number;
}

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);
  private spotifyApi: AxiosInstance;
  private accessToken: string;
  private tokenExpiry: Date;

  constructor(
    private clientId: string,
    private clientSecret: string,
  ) {}

  /**
   * Get access token from Spotify
   */
  async authenticate(): Promise<void> {
    try {
      const response = await axios.post<SpotifyAuthResponse>(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      this.spotifyApi = axios.create({
        baseURL: 'https://api.spotify.com/v1',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      this.logger.log('✓ Spotify authentication successful');
    } catch (error) {
      this.logger.error('Spotify authentication failed:', error.message);
      throw new HttpException(
        'Failed to authenticate with Spotify',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Check if token needs refresh
   */
  async ensureTokenValid(): Promise<void> {
    if (!this.accessToken || new Date() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  /**
   * Search tracks by query
   */
  async searchTracks(
    query: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<SpotifyTrack[]> {
    try {
      await this.ensureTokenValid();

      const response = await this.spotifyApi.get<SpotifySearchResponse>(
        '/search',
        {
          params: {
            q: query,
            type: 'track',
            limit,
            offset,
          },
        },
      );

      return response.data.tracks.items;
    } catch (error) {
      this.logger.error(`Search failed for query "${query}":`, error.message);
      throw new HttpException(
        'Failed to search tracks on Spotify',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get trending tracks for a specific year
   * Searches for popular tracks released in a given year
   */
  async getTrendingTracks(
    year: number,
    genre: string = '',
    limit: number = 50,
    offset: number = 0,
  ): Promise<SpotifyTrack[]> {
    try {
      await this.ensureTokenValid();

      let query = `year:${year}`;
      if (genre) {
        query += ` genre:${genre}`;
      }

      const response = await this.spotifyApi.get<SpotifySearchResponse>(
        '/search',
        {
          params: {
            q: query,
            type: 'track',
            limit,
            offset,
          },
        },
      );

      return response.data.tracks.items;
    } catch (error) {
      this.logger.error(`Failed to get trending tracks:`, error.message);
      throw new HttpException(
        'Failed to fetch trending tracks',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get multiple pages of trending tracks
   */
  async getTrendingTracksMultiplePages(
    year: number,
    totalTracks: number = 300,
    genre: string = '',
  ): Promise<SpotifyTrack[]> {
    const allTracks: SpotifyTrack[] = [];
    const pageSize = 50; // Spotify max limit per request
    const numPages = Math.ceil(totalTracks / pageSize);

    this.logger.log(
      `Fetching ${totalTracks} trending tracks from ${year}${genre ? ` (${genre})` : ''}...`,
    );

    for (let page = 0; page < numPages; page++) {
      const offset = page * pageSize;
      const tracks = await this.getTrendingTracks(
        year,
        genre,
        pageSize,
        offset,
      );

      allTracks.push(...tracks);
      this.logger.log(
        `✓ Fetched ${allTracks.length}/${totalTracks} tracks (${page + 1}/${numPages})`,
      );

      if (allTracks.length >= totalTracks) {
        break;
      }

      // Add delay to avoid rate limiting (100ms between requests)
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return allTracks.slice(0, totalTracks);
  }

  /**
   * Get audio features for a track
   */
  async getAudioFeatures(
    trackId: string,
  ): Promise<SpotifyAudioFeatures | null> {
    try {
      await this.ensureTokenValid();

      const response = await this.spotifyApi.get<SpotifyAudioFeatures>(
        `/audio-features/${trackId}`,
      );

      return response.data;
    } catch (error) {
      this.logger.warn(
        `Failed to get audio features for track ${trackId}`,
        error.message,
      );
      return null;
    }
  }

  /**
   * Get audio features for multiple tracks
   */
  async getAudioFeaturesMultiple(
    trackIds: string[],
  ): Promise<Map<string, SpotifyAudioFeatures>> {
    const featuresMap = new Map<string, SpotifyAudioFeatures>();
    const batchSize = 100; // Spotify max IDs per request

    for (let i = 0; i < trackIds.length; i += batchSize) {
      const batch = trackIds.slice(i, i + batchSize);
      try {
        await this.ensureTokenValid();

        const response = await this.spotifyApi.get<{
          audio_features: (SpotifyAudioFeatures | null)[];
        }>('/audio-features', {
          params: {
            ids: batch.join(','),
          },
        });

        batch.forEach((trackId, index) => {
          if (response.data.audio_features[index]) {
            featuresMap.set(trackId, response.data.audio_features[index]);
          }
        });

        this.logger.debug(
          `✓ Fetched audio features for batch ${Math.floor(i / batchSize) + 1}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to get audio features for batch`,
          error.message,
        );
      }

      // Add delay between batches
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return featuresMap;
  }

  /**
   * Format Spotify track data for database storage
   */
  formatTrackForDatabase(track: SpotifyTrack): {
    title: string;
    artistName: string;
    artistId: string;
    genre: string;
    duration: number;
    releaseDate: string;
    imageUrl: string;
    audioUrl: string;
    previewUrl: string;
    spotifyId: string;
    popularity: number;
    albumName: string;
  } {
    const artistName = track.artists[0]?.name || 'Unknown Artist';
    const imageUrl =
      track.album.images.find((img) => img.height === 300)?.url ||
      track.album.images[0]?.url ||
      '';

    return {
      title: track.name,
      artistName,
      artistId: track.artists[0]?.id || '',
      genre: 'Pop', // Default genre, can be customized
      duration: Math.floor(track.duration_ms / 1000), // Convert to seconds
      releaseDate: track.album.release_date,
      imageUrl,
      audioUrl: '', // Spotify doesn't provide direct audio URL
      previewUrl: track.preview_url || '',
      spotifyId: track.id,
      popularity: track.popularity,
      albumName: track.album.name,
    };
  }
}
