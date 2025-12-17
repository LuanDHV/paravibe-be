import { DataSource, Repository } from 'typeorm';
import axios from 'axios';
import { config } from 'dotenv';
import { AppleMusicService } from '../modules/apple-music/apple-music.service';
import type { ItunesTrack } from '../modules/apple-music/apple-music.service';
import { GeniusService } from '../modules/genius/genius.service';
import { MUSIC_GENRES } from '../config/music-genres';
import { Artist } from '../entities/Artist';
import { Song } from '../entities/Song';
import { User } from '../entities/User';
import { UserToken } from '../entities/UserToken';
import { Role } from '../entities/Role';
import { Playlist } from '../entities/Playlist';
import { PlaylistSong } from '../entities/PlaylistSong';
import { UserHistory } from '../entities/UserHistory';
import { Recommendation } from '../entities/Recommendation';

// Import Configuration
const TRACKS_PER_GENRE = 25;
const AI_SERVICE_TIMEOUT = 30000;
const RATE_LIMIT_DELAY = 500;
const IMPORT_WITHOUT_LYRICS = true; // Allow importing songs without lyrics
const FILTER_STREAMABLE_ONLY = true; // Only import streamable tracks

// 🧪 TEST MODE: Limit total tracks for quick testing
const TEST_MODE = true; // Set to false for full import
const TEST_MAX_TRACKS = 50; // Max tracks to import in test mode
const TEST_MAX_GENRES = 3; // Max genres to process in test mode

// Types
interface EmbedResponse {
  embedding: number[];
  processing_time: number;
}

interface ImportStats {
  imported: number;
  skipped: number;
}

// Helper: Fetch lyrics from Genius
async function fetchLyricsIfNeeded(
  song: Song,
  artist: Artist,
  geniusService: GeniusService,
): Promise<void> {
  if (song.lyrics) return;

  try {
    const lyrics = await geniusService.getLyricsByTitleAndArtist(
      song.title || '',
      artist.name || '',
    );
    if (lyrics) {
      song.lyrics = lyrics;
      console.log(`📝 Lyrics fetched from Genius for: "${song.title}"`);
    } else {
      console.log(`⚠️  No lyrics found on Genius for: "${song.title}"`);
    }
  } catch (error) {
    console.log(
      `⚠️  Genius lyrics fetch failed for: "${song.title}" - ${(error as Error).message}`,
    );
  }
}

// Helper: Generate lyric embedding from AI service
async function generateLyricEmbedding(
  lyrics: string,
  aiServiceUrl: string,
): Promise<number[] | null> {
  try {
    const response = await axios.post<EmbedResponse>(
      `${aiServiceUrl}/api/v1/embed/lyrics`,
      { lyrics },
      { timeout: AI_SERVICE_TIMEOUT },
    );
    return response.data?.embedding || null;
  } catch (error) {
    console.log(`⚠️  Lyrics embedding failed - ${(error as Error).message}`);
    return null;
  }
}

// Helper: Fetch all tracks from Apple Music across genres
async function fetchAppleMusicTracks(
  appleMusicService: AppleMusicService,
): Promise<ItunesTrack[]> {
  const allTracks: ItunesTrack[] = [];

  // Apply test mode limits
  const genresToProcess = TEST_MODE
    ? MUSIC_GENRES.slice(0, TEST_MAX_GENRES)
    : MUSIC_GENRES;

  console.log(
    `📊 Fetching ${genresToProcess.length} genres × ${TRACKS_PER_GENRE} tracks from Apple Music...`,
  );

  if (TEST_MODE) {
    console.log(
      `🧪 TEST MODE: Limited to ${TEST_MAX_GENRES} genres, max ${TEST_MAX_TRACKS} total tracks`,
    );
  }

  for (const genre of genresToProcess) {
    try {
      const genreTracks = await appleMusicService.searchByGenre(
        genre,
        TRACKS_PER_GENRE,
      );
      allTracks.push(...genreTracks);
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
    } catch {
      // Skip failed genre requests silently
    }
  }

  // Filter streamable tracks if needed
  let filteredTracks = allTracks;
  if (FILTER_STREAMABLE_ONLY) {
    filteredTracks = allTracks.filter((track) => track.isStreamable);
    console.log(
      `🎵 Filtered to ${filteredTracks.length}/${allTracks.length} streamable tracks`,
    );
  }

  // Remove duplicates by track ID
  let uniqueTracks = Array.from(
    new Map(filteredTracks.map((track) => [track.trackId, track])).values(),
  );

  // Apply test mode track limit
  if (TEST_MODE && uniqueTracks.length > TEST_MAX_TRACKS) {
    uniqueTracks = uniqueTracks.slice(0, TEST_MAX_TRACKS);
    console.log(
      `🧪 TEST MODE: Limited to ${TEST_MAX_TRACKS} tracks for testing`,
    );
  }

  return uniqueTracks;
}

// Helper: Get or create artist
async function getOrCreateArtist(
  artistName: string,
  imageUrl: string,
  artistRepository: Repository<Artist>,
): Promise<Artist> {
  let artist = await artistRepository.findOne({
    where: { name: artistName },
  });

  if (!artist) {
    artist = artistRepository.create({
      name: artistName,
      country: 'Unknown',
      genre: 'Pop',
      imageUrl,
    });
    await artistRepository.save(artist);
  }

  return artist;
}

// Helper: Extract image URL from iTunes track
function getImageUrl(track: ItunesTrack): string {
  return track.artworkUrl100 || track.artworkUrl60 || '';
}

// Helper: Convert ISO date to MySQL date format
function convertToMySQLDate(isoDateString: string | undefined): string | null {
  if (!isoDateString) return null;

  try {
    // Parse ISO date and convert to YYYY-MM-DD format
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

// Helper: Process a single track
async function processTrack(
  track: ItunesTrack,
  artistRepository: Repository<Artist>,
  songRepository: Repository<Song>,
  geniusService: GeniusService,
  stats: ImportStats,
): Promise<void> {
  try {
    // Check if song already exists (by title + artist combination)
    const artistName = track.artistName || 'Unknown Artist';

    const existingSong = await songRepository
      .createQueryBuilder('song')
      .innerJoin('song.artist', 'artist')
      .where('song.title = :title', { title: track.trackName })
      .andWhere('artist.name = :artistName', { artistName })
      .getOne();

    if (existingSong) {
      stats.skipped++;
      return;
    }

    // Get or create artist
    const imageUrl = getImageUrl(track);
    const artist = await getOrCreateArtist(
      artistName,
      imageUrl,
      artistRepository,
    );

    // Create song entity
    const song = songRepository.create({
      title: track.trackName,
      artistId: artist.artistId,
      genre: track.primaryGenreName || 'Pop',
      duration: Math.floor(track.trackTimeMillis / 1000),
      releaseDate: convertToMySQLDate(track.releaseDate),
      imageUrl,
      audioUrl: '',
      previewUrl: track.previewUrl || '',
      lyrics: '',
    });

    await songRepository.save(song);

    // Try to generate embeddings
    const embeddingsGenerated = await generateEmbeddingsSimple(
      song,
      artist,
      songRepository,
      geniusService,
    );

    if (embeddingsGenerated) {
      stats.imported++;
    } else if (IMPORT_WITHOUT_LYRICS) {
      // Keep song even without lyrics/embeddings if configured
      console.log(`ℹ️  Imported without lyrics: "${song.title}"`);
      stats.imported++;
    } else {
      // Remove song if embeddings required but failed
      await songRepository.remove(song);
      stats.skipped++;
    }
  } catch (error) {
    console.log(`❌ Error processing track: ${(error as Error).message}`);
    stats.skipped++;
  }
}

// Helper: Print import summary
function printSummary(stats: ImportStats): void {
  console.log('\n' + '='.repeat(50));
  console.log('📈 Summary:');
  console.log(`   Imported: ${stats.imported}`);
  console.log(`   Skipped:  ${stats.skipped}`);
  console.log('='.repeat(50));

  if (stats.imported > 0) {
    console.log('✅ Import completed!');
    if (IMPORT_WITHOUT_LYRICS) {
      console.log('ℹ️  Note: Some songs imported without lyrics/embeddings');
    }
  } else {
    console.log('⚠️  No new tracks imported');
  }
}

// Main: Generate embeddings and update song
async function generateEmbeddingsSimple(
  song: Song,
  artist: Artist,
  songRepository: Repository<Song>,
  geniusService: GeniusService,
): Promise<boolean> {
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    // Step 1: Fetch lyrics if needed
    await fetchLyricsIfNeeded(song, artist, geniusService);

    // Step 2: If no lyrics, return based on config
    if (!song.lyrics) {
      if (IMPORT_WITHOUT_LYRICS) {
        console.log(`⚠️  No lyrics for: "${song.title}" - importing anyway`);
        return false; // No embeddings but we keep the song
      }
      console.log(`❌ No lyrics available for: "${song.title}"`);
      return false;
    }

    // Step 3: Generate lyric embedding
    const lyricEmbedding = await generateLyricEmbedding(
      song.lyrics,
      aiServiceUrl,
    );

    if (!lyricEmbedding) {
      console.log(`❌ No embeddings generated for: "${song.title}"`);
      return false;
    }

    // Step 4: Update database with embeddings
    await songRepository.update(song.songId, {
      lyricVector: lyricEmbedding,
    });
    console.log(`✅ Lyric embeddings generated for: "${song.title}"`);
    return true;
  } catch (error) {
    console.log(
      `❌ Processing failed for: "${song.title}" - ${(error as Error).message}`,
    );
    return false;
  }
}

async function importAppleMusicTracks() {
  config({ path: '.env.local' });

  const appDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USER || 'paravibe',
    password: process.env.DB_PASS || 'mypass',
    database: process.env.DB_NAME || 'paravibe_db',
    entities: [
      User,
      UserToken,
      Role,
      Artist,
      Song,
      Playlist,
      PlaylistSong,
      UserHistory,
      Recommendation,
    ],
    synchronize: false,
    logging: false,
  });

  try {
    await appDataSource.initialize();
    console.log('✓ Database connected');

    // Initialize Apple Music service (no auth needed!)
    const appleMusicService = new AppleMusicService();
    console.log('✓ Apple Music service initialized');

    // Initialize Genius service
    const { geniusConfig } = await import('../config/genius.config');
    const geniusService = new GeniusService(geniusConfig.accessToken);

    const artistRepository = appDataSource.getRepository(Artist);
    const songRepository = appDataSource.getRepository(Song);

    // Fetch tracks from Apple Music
    const uniqueTracks = await fetchAppleMusicTracks(appleMusicService);
    console.log(
      `✓ Fetched ${uniqueTracks.length} unique tracks from Apple Music`,
    );
    console.log('💾 Starting import process with Genius lyrics...');

    const stats: ImportStats = { imported: 0, skipped: 0 };

    // Process each track
    for (const track of uniqueTracks) {
      await processTrack(
        track,
        artistRepository,
        songRepository,
        geniusService,
        stats,
      );
    }

    // Print summary
    printSummary(stats);
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    if (appDataSource.isInitialized) {
      await appDataSource.destroy();
    }
    process.exit(0);
  }
}

void importAppleMusicTracks();
