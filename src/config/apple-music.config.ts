/**
 * Cấu hình Apple Music / iTunes Search API
 * Configuration for iTunes Search API integration
 *
 * iTunes Search API là API công khai của Apple:
 * - Không cần đăng ký, không cần API key
 * - Không cần OAuth hoặc authentication
 * - Hoàn toàn miễn phí
 * - Cung cấp preview audio (mp3 30s) ổn định
 * - Phù hợp cho audio embedding và music player
 *
 * Tài liệu: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */

// API Endpoints
const ITUNES_API_BASE_URL = 'https://itunes.apple.com';
const ITUNES_SEARCH_ENDPOINT = '/search';

// Default search parameters
const DEFAULT_MEDIA = 'music';
const DEFAULT_ENTITY = 'song';
const DEFAULT_LIMIT = 50;
const DEFAULT_COUNTRY = 'us'; // US store có nhiều nhạc nhất

export const appleMusicConfig = {
  // iTunes API Base URL
  apiBaseUrl: ITUNES_API_BASE_URL,

  // Search endpoint
  searchEndpoint: ITUNES_SEARCH_ENDPOINT,

  // Default parameters
  defaults: {
    media: DEFAULT_MEDIA,
    entity: DEFAULT_ENTITY,
    limit: DEFAULT_LIMIT,
    country: DEFAULT_COUNTRY,
  },
} as const;

export function buildItunesSearchUrl(term: string, limit?: number): string {
  const params = new URLSearchParams({
    term,
    media: appleMusicConfig.defaults.media,
    entity: appleMusicConfig.defaults.entity,
    limit: String(limit || appleMusicConfig.defaults.limit),
    country: appleMusicConfig.defaults.country,
  });

  return `${appleMusicConfig.apiBaseUrl}${appleMusicConfig.searchEndpoint}?${params.toString()}`;
}

export function buildGenreSearchUrl(genre: string, limit?: number): string {
  return buildItunesSearchUrl(genre, limit);
}
