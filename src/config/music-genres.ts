/**
 * Cấu hình các thể loại nhạc
 * Danh sách các thể loại nhạc phổ biến cho music streaming
 *
 * Music Genres Configuration
 * List of common music genres for streaming services
 */

export const MUSIC_GENRES = [
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

export function getGenres(count?: number): string[] {
  if (!count || count >= MUSIC_GENRES.length) {
    return MUSIC_GENRES;
  }
  return MUSIC_GENRES.slice(0, count);
}

export function getRandomGenres(count: number): string[] {
  const shuffled = [...MUSIC_GENRES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
