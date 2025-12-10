import { DataSource, Repository } from 'typeorm';
import axios from 'axios';
import { config } from 'dotenv';
import { SpotifyService } from '../modules/spotify/spotify.service';
import { GeniusService } from '../modules/genius/genius.service';
import { Artist } from '../entities/Artist';
import { Song } from '../entities/Song';
import { User } from '../entities/User';
import { UserToken } from '../entities/UserToken';
import { Role } from '../entities/Role';
import { Playlist } from '../entities/Playlist';
import { PlaylistSong } from '../entities/PlaylistSong';
import { UserHistory } from '../entities/UserHistory';
import { Recommendation } from '../entities/Recommendation';

// Constants
const SPOTIFY_GENRES = [
  'pop',
  'rock',
  'hiphop',
  'edm',
  'latin',
  'rnb',
  'indie',
  'alternative',
  'trap',
  'k-pop',
  'reggae',
  'classical',
  'electronic',
  'soul',
  'jazz',
  'country',
] as const;
const TRACKS_PER_GENRE = 25;
const AI_SERVICE_TIMEOUT = 30000;
const RATE_LIMIT_DELAY = 500;
const PREFERRED_IMAGE_HEIGHT = 300;

// Types
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
}

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

// Helper: Fetch all tracks from Spotify across genres
async function fetchSpotifyTracks(
  spotifyService: SpotifyService,
): Promise<SpotifyTrack[]> {
  const allTracks: SpotifyTrack[] = [];

  console.log(
    `📊 Fetching ${SPOTIFY_GENRES.length} genres × ${TRACKS_PER_GENRE} tracks from Spotify...`,
  );

  for (const genre of SPOTIFY_GENRES) {
    try {
      const genreTracks = await spotifyService.getTrendingTracksMultiplePages(
        2025,
        TRACKS_PER_GENRE,
        genre,
      );
      allTracks.push(...(genreTracks as SpotifyTrack[]));
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
    } catch {
      // Skip failed genre requests silently
    }
  }

  // Remove duplicates by track ID
  return Array.from(
    new Map(allTracks.map((track) => [track.id, track])).values(),
  );
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

// Helper: Extract image URL from Spotify track
function getImageUrl(track: SpotifyTrack): string {
  return (
    track.album.images.find((img) => img.height === PREFERRED_IMAGE_HEIGHT)
      ?.url ||
    track.album.images[0]?.url ||
    ''
  );
}

// Helper: Process a single track
async function processTrack(
  track: SpotifyTrack,
  artistRepository: Repository<Artist>,
  songRepository: Repository<Song>,
  geniusService: GeniusService,
  stats: ImportStats,
): Promise<void> {
  try {
    // Check if song already exists
    const existingSong = await songRepository.findOne({
      where: { title: track.name },
    });
    if (existingSong) {
      stats.skipped++;
      return;
    }

    // Get or create artist
    const artistName = track.artists[0]?.name || 'Unknown Artist';
    const imageUrl = getImageUrl(track);
    const artist = await getOrCreateArtist(
      artistName,
      imageUrl,
      artistRepository,
    );

    // Create song entity
    const song = songRepository.create({
      title: track.name,
      artistId: artist.artistId,
      genre: 'Pop',
      duration: Math.floor(track.duration_ms / 1000),
      releaseDate: track.album.release_date,
      imageUrl,
      audioUrl: '',
      previewUrl: track.preview_url || '',
      lyrics: '',
    });

    await songRepository.save(song);

    // Generate embeddings
    const embeddingsGenerated = await generateEmbeddingsSimple(
      song,
      artist,
      songRepository,
      geniusService,
    );

    if (embeddingsGenerated) {
      stats.imported++;
    } else {
      // Remove song if embeddings failed
      await songRepository.remove(song);
      stats.skipped++;
    }
  } catch {
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
    console.log('✅ Import completed with embeddings!');
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

    // Step 2: Generate embedding if lyrics exist
    if (!song.lyrics) {
      console.log(`❌ No lyrics available for: "${song.title}"`);
      return false;
    }

    const lyricEmbedding = await generateLyricEmbedding(
      song.lyrics,
      aiServiceUrl,
    );

    if (!lyricEmbedding) {
      console.log(`❌ No embeddings generated for: "${song.title}"`);
      return false;
    }

    // Step 3: Update database
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

async function importSpotifyTracks() {
  config({ path: '.env.local' });
  const { spotifyConfig } = await import('../config/spotify.config');

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

    if (!spotifyConfig.clientId || !spotifyConfig.clientSecret) {
      throw new Error('Spotify client ID and secret must be configured');
    }

    const spotifyService = new SpotifyService(
      spotifyConfig.clientId,
      spotifyConfig.clientSecret,
    );
    await spotifyService.authenticate();

    // Initialize Genius service
    const { geniusConfig } = await import('../config/genius.config');
    if (!geniusConfig.accessToken) {
      console.warn(
        '⚠️  Genius access token not configured. Lyrics will not be fetched.',
      );
      console.warn('   Get your token at: https://genius.com/api-clients');
    }
    const geniusService = new GeniusService(geniusConfig.accessToken);

    const artistRepository = appDataSource.getRepository(Artist);
    const songRepository = appDataSource.getRepository(Song);

    // Fetch tracks from Spotify
    const uniqueTracks = await fetchSpotifyTracks(spotifyService);
    console.log(`✓ Fetched ${uniqueTracks.length} unique tracks`);
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

void importSpotifyTracks();
