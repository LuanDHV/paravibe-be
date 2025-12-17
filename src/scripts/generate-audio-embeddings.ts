import { DataSource, Repository } from 'typeorm';
import axios from 'axios';
import { config } from 'dotenv';
import { Song } from '../entities/Song';
import { User } from '../entities/User';
import { UserToken } from '../entities/UserToken';
import { Role } from '../entities/Role';
import { Playlist } from '../entities/Playlist';
import { PlaylistSong } from '../entities/PlaylistSong';
import { UserHistory } from '../entities/UserHistory';
import { Recommendation } from '../entities/Recommendation';
import { Artist } from '../entities/Artist';

config({ path: '.env.local' }); // Load from .env.local file

// Configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const BATCH_SIZE = 10; // Process 10 songs at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between batches
const AI_SERVICE_TIMEOUT = 60000; // 60 seconds timeout for audio processing

// 🧪 TEST MODE: Limit songs for quick testing
const TEST_MODE = true; // Set to false for full processing
const TEST_MAX_SONGS = 5; // Max songs to process in test mode

// Types
interface AudioEmbedResponse {
  embedding: number[];
  processing_time: number;
}

interface ProcessingStats {
  total: number;
  processed: number;
  success: number;
  failed: number;
  skipped: number;
}

// Helper: Generate audio embeddings via AI Service
async function generateAudioEmbedding(
  previewUrl: string,
): Promise<number[] | null> {
  try {
    console.log(
      `   → Calling AI Service: ${AI_SERVICE_URL}/api/v1/embed/audio`,
    );
    console.log(`   → Preview URL: ${previewUrl.substring(0, 80)}...`);

    const response = await axios.post<AudioEmbedResponse>(
      `${AI_SERVICE_URL}/api/v1/embed/audio`,
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

// Helper: Process a batch of songs
async function processBatch(
  songs: Song[],
  songRepository: Repository<Song>,
  stats: ProcessingStats,
): Promise<void> {
  for (const song of songs) {
    try {
      // Skip if no preview URL
      if (!song.previewUrl) {
        console.log(`⏭️  Skipping "${song.title}" - No preview URL`);
        stats.skipped++;
        continue;
      }

      // Skip if already has audio embeddings
      if (song.audioVector) {
        console.log(
          `⏭️  Skipping "${song.title}" - Already has audio embeddings`,
        );
        stats.skipped++;
        continue;
      }

      console.log(
        `🎵 Processing: "${song.title}" by ${song.artist?.name || 'Unknown'}`,
      );

      // Generate audio embeddings
      const audioEmbedding = await generateAudioEmbedding(song.previewUrl);

      if (audioEmbedding && audioEmbedding.length > 0) {
        // Save to database as JSON object (TypeORM handles serialization)
        song.audioVector = audioEmbedding as unknown as object;
        await songRepository.save(song);

        console.log(
          `✅ Audio embeddings saved for: "${song.title}" (${audioEmbedding.length}-dim)`,
        );
        stats.success++;
      } else {
        console.log(
          `❌ Failed to generate audio embeddings for: "${song.title}"`,
        );
        stats.failed++;
      }

      stats.processed++;
    } catch (error) {
      console.error(`❌ Error processing song ${song.songId}:`, error);
      stats.failed++;
      stats.processed++;
    }
  }
}

// Helper: Print summary
function printSummary(stats: ProcessingStats): void {
  console.log('\n==================================================');
  console.log('📈 Audio Embeddings Generation Summary:');
  console.log(`   Total Songs:     ${stats.total}`);
  console.log(`   Processed:       ${stats.processed}`);
  console.log(`   Success:         ${stats.success}`);
  console.log(`   Failed:          ${stats.failed}`);
  console.log(`   Skipped:         ${stats.skipped}`);
  console.log('==================================================');
}

// Main function
async function main() {
  let dataSource: DataSource | null = null;

  try {
    // Initialize database connection
    dataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
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
    });

    await dataSource.initialize();
    console.log('✓ Database connected');

    const songRepository = dataSource.getRepository(Song);

    // Get all songs without audio embeddings but with preview URL
    let songsQuery = songRepository
      .createQueryBuilder('song')
      .leftJoinAndSelect('song.artist', 'artist')
      .where('song.audioVector IS NULL')
      .andWhere('song.previewUrl IS NOT NULL')
      .orderBy('song.songId', 'ASC');

    // Apply test mode limit
    if (TEST_MODE) {
      songsQuery = songsQuery.take(TEST_MAX_SONGS);
    }

    const songsToProcess = await songsQuery.getMany();

    const validSongs = songsToProcess.filter((song) => song.previewUrl);

    if (validSongs.length === 0) {
      console.log('✅ All songs already have audio embeddings!');
      return;
    }

    console.log(
      `\n🎯 Found ${validSongs.length} songs without audio embeddings`,
    );
    console.log(`📦 Processing in batches of ${BATCH_SIZE}...\n`);

    if (TEST_MODE) {
      console.log(`🧪 TEST MODE: Limited to ${TEST_MAX_SONGS} songs\n`);
    }

    const stats: ProcessingStats = {
      total: validSongs.length,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
    };

    // Process songs in batches
    for (let i = 0; i < validSongs.length; i += BATCH_SIZE) {
      const batch = validSongs.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(validSongs.length / BATCH_SIZE);

      console.log(
        `\n📦 Batch ${batchNumber}/${totalBatches} (${batch.length} songs)`,
      );

      await processBatch(batch, songRepository, stats);

      // Delay between batches to avoid overwhelming AI service
      if (i + BATCH_SIZE < validSongs.length) {
        console.log(
          `⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_BATCHES),
        );
      }
    }

    printSummary(stats);
    console.log('\n✅ Audio embeddings generation completed!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main();
