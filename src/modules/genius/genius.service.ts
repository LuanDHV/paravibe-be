/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

// Constants
const LYRICS_SELECTORS = [
  '[data-lyrics-container="true"]',
  '.Lyrics__Container-sc-1ynbvzw-1',
  '[class^="Lyrics__Container"]',
] as const;

// Types
interface GeniusSearchResponse {
  response: {
    hits: Array<{
      result: {
        id: number;
        title: string;
        primary_artist: {
          name: string;
        };
        url: string;
        lyrics_state: string;
      };
    }>;
  };
}

@Injectable()
export class GeniusService {
  private readonly logger = new Logger(GeniusService.name);
  private geniusApi: AxiosInstance;

  constructor(private accessToken: string) {
    this.geniusApi = axios.create({
      baseURL: 'https://api.genius.com',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  /**
   * Search for a song on Genius
   */
  async searchSong(title: string, artist: string): Promise<string | null> {
    try {
      const query = `${title} ${artist}`;
      const response = await this.geniusApi.get<GeniusSearchResponse>(
        '/search',
        {
          params: { q: query },
        },
      );

      if (response.data.response.hits.length === 0) {
        this.logger.debug(`No results found for: ${query}`);
        return null;
      }

      // Get the first result's URL
      const songUrl = response.data.response.hits[0].result.url;
      return songUrl;
    } catch (error) {
      this.logger.warn(
        `Failed to search song: ${title} - ${artist}`,
        error.message,
      );
      return null;
    }
  }

  /**
   * Scrape lyrics from Genius song page
   */
  async getLyrics(songUrl: string): Promise<string | null> {
    try {
      /* eslint-disable */
      const response = await axios.get(songUrl);
      const $ = cheerio.load(response.data);

      let lyrics = '';

      // Try different selectors (Genius updates their HTML structure)
      for (const selector of LYRICS_SELECTORS) {
        const elements = $(selector);
        if (elements.length > 0) {
          elements.each((_, element) => {
            lyrics += $(element).text() + '\n';
          });
          break;
        }
      }
      /* eslint-enable */

      if (!lyrics.trim()) {
        this.logger.warn(`Could not extract lyrics from: ${songUrl}`);
        return null;
      }

      return lyrics.trim();
    } catch (error) {
      this.logger.warn(
        `Failed to scrape lyrics from: ${songUrl}`,
        (error as Error).message,
      );
      return null;
    }
  }

  /**
   * Get lyrics for a song by title and artist
   */
  async getLyricsByTitleAndArtist(
    title: string,
    artist: string,
  ): Promise<string | null> {
    try {
      const songUrl = await this.searchSong(title, artist);
      if (!songUrl) {
        return null;
      }

      const lyrics = await this.getLyrics(songUrl);
      return lyrics;
    } catch (error) {
      this.logger.warn(
        `Failed to get lyrics for: ${title} - ${artist}`,
        (error as Error).message,
      );
      return null;
    }
  }
}
