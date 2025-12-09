/**
 * Cấu hình các thể loại nhạc Spotify
 * Danh sách các thể loại nhạc có sẵn trên Spotify
 *
 * Spotify Genres Configuration
 * List of available music genres on Spotify
 */

export const SPOTIFY_GENRES = [
  // Các thể loại phổ biến / Popular genres
  'pop',
  'rock',
  'hiphop',
  'edm',
  'latin',

  // R&B và Soul / R&B and Soul
  'rnb',
  'soul',

  // Alternative và Indie / Alternative and Indie
  'indie',
  'alternative',
  'experimental',

  // Electronic và House / Electronic and House
  'electronic',
  'house',
  'techno',

  // Urban và Trap / Urban and Trap
  'trap',
  'grime',
  'drill',

  // Quốc tế / International
  'k-pop',
  'j-pop',
  'reggaeton',

  // Truyền thống / Traditional
  'reggae',
  'jazz',
  'classical',
  'country',
  'folk',

  // Các thể loại khác phổ biến / Other popular genres
  'metal',
  'punk',
  'disco',
  'funk',
  'gospel',
  'blues',
  'ambient',
  'synthwave',
  'lofi',
  'dubstep',
];

/**
 * Lấy một tập hợp con các thể loại
 * Get a subset of genres
 *
 * @param count Số lượng thể loại cần trả về / Number of genres to return
 * @returns Mảng các thể loại / Array of genres
 */
export function getGenres(count?: number): string[] {
  if (!count || count >= SPOTIFY_GENRES.length) {
    return SPOTIFY_GENRES;
  }
  return SPOTIFY_GENRES.slice(0, count);
}

/**
 * Lấy các thể loại ngẫu nhiên
 * Get random genres
 *
 * @param count Số lượng thể loại ngẫu nhiên / Number of genres to return
 * @returns Mảng các thể loại ngẫu nhiên / Array of random genres
 */
export function getRandomGenres(count: number): string[] {
  const shuffled = [...SPOTIFY_GENRES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
