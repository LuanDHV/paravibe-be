/**
 * Import Apple Music Tracks Script
 *
 * This script imports music tracks from Apple Music API and enriches them with:
 * 1. Track metadata from Apple Music
 * 2. Audio embeddings from AI service (using preview URLs)
 * 3. Metadata embeddings from AI service (genre, artist, album, year)
 *
 * Features:
 * - Fetches tracks across multiple genres
 * - Filters streamable tracks only
 * - Generates both audio and metadata embeddings automatically
 * - Skips duplicate tracks
 * - Test mode for quick validation
 * - No lyrics dependency (copyright compliant)
 */

import { DataSource, Repository } from 'typeorm';
import axios from 'axios';
import { config } from 'dotenv';
import { AppleMusicService } from '../modules/apple-music/apple-music.service';
import type { ItunesTrack } from '../modules/apple-music/apple-music.service';
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
const AI_SERVICE_TIMEOUT = 60000; // 60 seconds for audio processing
const RATE_LIMIT_DELAY = 500;
const FILTER_STREAMABLE_ONLY = true; // Only import streamable tracks
const GENERATE_AUDIO_EMBEDDINGS = true; // Generate audio embeddings during import
const GENERATE_METADATA_EMBEDDINGS = true; // Generate metadata embeddings during import

// 🧪 TEST MODE: Limit total tracks for quick testing
const TEST_MODE = true; // Set to false for full import
const TEST_MAX_TRACKS = 50; // Max tracks to import in test mode
const TEST_MAX_GENRES = 3; // Max genres to process in test mode

// Types
interface AudioEmbedResponse {
  embedding: number[];
  processing_time: number;
}

interface MetadataEmbedResponse {
  embedding: number[];
  processing_time: number;
}

interface ImportStats {
  imported: number;
  skipped: number;
  audioEmbeddingsSuccess: number;
  audioEmbeddingsFailed: number;
  metadataEmbeddingsSuccess: number;
  metadataEmbeddingsFailed: number;
}

// Helper: Generate metadata embedding from iTunes track data
async function generateMetadataEmbedding(
  song: Song,
  artist: Artist,
  track: ItunesTrack,
  aiServiceUrl: string,
): Promise<number[] | null> {
  try {
    // Create rich metadata text from iTunes track data
    const year = track.releaseDate
      ? new Date(track.releaseDate).getFullYear()
      : 'Unknown';
    const album = track.collectionName || 'Unknown Album';
    const duration = Math.floor(track.trackTimeMillis / 1000);

    const metadataText = `
    Title: ${song.title}
    Artist: ${artist.name}
    Genre: ${song.genre}
    Album: ${album}
    Release Year: ${year}
    Duration: ${duration} seconds
    Country: ${track.country}
    `.trim();

    console.log(`   → Generating metadata embedding for: "${song.title}"`);

    const response = await axios.post<MetadataEmbedResponse>(
      `${aiServiceUrl}/api/v1/embed/metadata`,
      { text: metadataText },
      { timeout: 30000 },
    );

    return response.data?.embedding || null;
  } catch (error) {
    console.log(`⚠️  Metadata embedding failed - ${(error as Error).message}`);
    return null;
  }
}

// Helper: Generate audio embeddings via AI Service
async function generateAudioEmbedding(
  previewUrl: string,
  aiServiceUrl: string,
): Promise<number[] | null> {
  try {
    console.log(`   → Calling AI Service: ${aiServiceUrl}/api/v1/embed/audio`);
    console.log(`   → Preview URL: ${previewUrl.substring(0, 80)}...`);

    const response = await axios.post<AudioEmbedResponse>(
      `${aiServiceUrl}/api/v1/embed/audio`,
      { audio_url: previewUrl },
      { timeout: AI_SERVICE_TIMEOUT },
    );
    return response.data?.embedding || null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(`⚠️  Audio embedding failed:`);
      console.log(`   → Status: ${error.response?.status || 'No response'}`);
      const detail = error.response?.data as { detail?: string };
      console.log(`   → Message: ${detail?.detail || error.message}`);
      console.log(`   → URL: ${error.config?.url}`);
    } else {
      console.log(`⚠️  Audio embedding failed - ${(error as Error).message}`);
    }
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
    });

    await songRepository.save(song);

    // Try to generate embeddings
    const embeddingResult = await generateEmbeddingsSimple(
      song,
      artist,
      track,
      songRepository,
    );

    // Track embedding statistics
    if (embeddingResult.audioSuccess) {
      stats.audioEmbeddingsSuccess++;
    } else if (GENERATE_AUDIO_EMBEDDINGS && song.previewUrl) {
      stats.audioEmbeddingsFailed++;
    }

    if (embeddingResult.metadataSuccess) {
      stats.metadataEmbeddingsSuccess++;
    } else if (GENERATE_METADATA_EMBEDDINGS) {
      stats.metadataEmbeddingsFailed++;
    }

    // Decide whether to keep the song
    const hasAnyEmbedding =
      embeddingResult.audioSuccess || embeddingResult.metadataSuccess;

    if (hasAnyEmbedding) {
      stats.imported++;
    } else {
      // Remove song if no embeddings generated
      console.log(
        `⚠️  No embeddings generated for: "${song.title}" - removing`,
      );
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
  console.log(`   Imported:              ${stats.imported}`);
  console.log(`   Skipped:               ${stats.skipped}`);
  console.log(
    `   Audio Embeddings:      ${stats.audioEmbeddingsSuccess} success / ${stats.audioEmbeddingsFailed} failed`,
  );
  console.log(
    `   Metadata Embeddings:   ${stats.metadataEmbeddingsSuccess} success / ${stats.metadataEmbeddingsFailed} failed`,
  );
  console.log('='.repeat(50));

  if (stats.imported > 0) {
    console.log('✅ Import completed!');
    console.log(
      'ℹ️  Note: Using audio + metadata embeddings (no lyrics dependency)',
    );
  } else {
    console.log('⚠️  No new tracks imported');
  }
}

// Main: Generate embeddings and update song
async function generateEmbeddingsSimple(
  song: Song,
  artist: Artist,
  track: ItunesTrack,
  songRepository: Repository<Song>,
): Promise<{ audioSuccess: boolean; metadataSuccess: boolean }> {
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    let audioSuccess = false;
    let metadataSuccess = false;

    // Step 1: Generate audio embedding if preview URL available
    if (GENERATE_AUDIO_EMBEDDINGS && song.previewUrl) {
      const audioEmbedding = await generateAudioEmbedding(
        song.previewUrl,
        aiServiceUrl,
      );

      if (audioEmbedding) {
        await songRepository.update(song.songId, {
          audioVector: audioEmbedding as unknown as object,
        });
        console.log(
          `✅ Audio embeddings generated for: "${song.title}" (${audioEmbedding.length}-dim)`,
        );
        audioSuccess = true;
      } else {
        console.log(`⚠️  Audio embeddings failed for: "${song.title}"`);
      }
    } else if (!song.previewUrl) {
      console.log(`⚠️  No preview URL for: "${song.title}"`);
    }

    // Step 2: Generate metadata embedding
    if (GENERATE_METADATA_EMBEDDINGS) {
      const metadataEmbedding = await generateMetadataEmbedding(
        song,
        artist,
        track,
        aiServiceUrl,
      );

      if (metadataEmbedding) {
        await songRepository.update(song.songId, {
          metadataVector: metadataEmbedding as unknown as object,
        });
        console.log(
          `✅ Metadata embeddings generated for: "${song.title}" (${metadataEmbedding.length}-dim)`,
        );
        metadataSuccess = true;
      } else {
        console.log(`⚠️  Metadata embeddings failed for: "${song.title}"`);
      }
    }

    return { audioSuccess, metadataSuccess };
  } catch (error) {
    console.log(
      `❌ Processing failed for: "${song.title}" - ${(error as Error).message}`,
    );
    return { audioSuccess: false, metadataSuccess: false };
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

    const artistRepository = appDataSource.getRepository(Artist);
    const songRepository = appDataSource.getRepository(Song);

    // Fetch tracks from Apple Music
    const uniqueTracks = await fetchAppleMusicTracks(appleMusicService);
    console.log(
      `✓ Fetched ${uniqueTracks.length} unique tracks from Apple Music`,
    );
    console.log(
      '💾 Starting import process with audio and metadata embeddings...',
    );

    const stats: ImportStats = {
      imported: 0,
      skipped: 0,
      audioEmbeddingsSuccess: 0,
      audioEmbeddingsFailed: 0,
      metadataEmbeddingsSuccess: 0,
      metadataEmbeddingsFailed: 0,
    };

    // Process each track
    for (const track of uniqueTracks) {
      await processTrack(track, artistRepository, songRepository, stats);
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
