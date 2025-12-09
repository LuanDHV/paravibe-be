import { DataSource, Repository } from 'typeorm';
import axios from 'axios';
import { config } from 'dotenv';
import { SpotifyService } from '../modules/spotify/spotify.service';
import { Artist } from '../entities/Artist';
import { Song } from '../entities/Song';
import { User } from '../entities/User';
import { UserToken } from '../entities/UserToken';
import { Role } from '../entities/Role';
import { Playlist } from '../entities/Playlist';
import { PlaylistSong } from '../entities/PlaylistSong';
import { UserHistory } from '../entities/UserHistory';
import { Recommendation } from '../entities/Recommendation';

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

async function generateEmbeddingsForSong(
  song: Song,
  artist: Artist,
  songRepository: Repository<Song>,
): Promise<boolean> {
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    let audioEmbedding: number[] | null = null;
    let lyricEmbedding: number[] | null = null;

    // Generate audio embedding if preview_url exists
    if (song.previewUrl) {
      try {
        const audioResponse = await axios.post<EmbedResponse>(
          `${aiServiceUrl}/api/v1/embed/audio`,
          { audio_url: song.previewUrl },
          { timeout: 30000 },
        );
        if (audioResponse.data?.embedding) {
          audioEmbedding = audioResponse.data.embedding;
        }
      } catch (error) {
        console.log(
          `⚠️  Audio embedding failed for: "${song.title}" - ${(error as Error).message}`,
        );
      }
    }

    // Generate lyrics embedding if lyrics exist
    if (song.lyrics) {
      try {
        const lyricsResponse = await axios.post<EmbedResponse>(
          `${aiServiceUrl}/api/v1/embed/lyrics`,
          { lyrics: song.lyrics },
          { timeout: 30000 },
        );
        if (lyricsResponse.data?.embedding) {
          lyricEmbedding = lyricsResponse.data.embedding;
        }
      } catch (error) {
        console.log(
          `⚠️  Lyrics embedding failed for: "${song.title}" - ${(error as Error).message}`,
        );
      }
    }

    if (audioEmbedding || lyricEmbedding) {
      await songRepository.update(song.songId, {
        audioVector: audioEmbedding,
        lyricVector: lyricEmbedding,
      });
      console.log(`🎯 AI embeddings generated for: "${song.title}"`);
      return true;
    } else {
      console.log(`❌ No embeddings generated for: "${song.title}"`);
      return false;
    }
  } catch (error) {
    console.log(
      `❌ AI Service unavailable for: "${song.title}" - ${(error as Error).message}`,
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

    const artistRepository = appDataSource.getRepository(Artist);
    const songRepository = appDataSource.getRepository(Song);

    let totalImported = 0;
    let totalSkipped = 0;

    const genres = [
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
    ];
    const tracksPerGenre = 25;
    const allTracks: SpotifyTrack[] = [];

    console.log(
      `📊 Fetching ${genres.length} genres × ${tracksPerGenre} tracks from Spotify...`,
    );

    for (let g = 0; g < genres.length; g++) {
      try {
        const genreTracks = await spotifyService.getTrendingTracksMultiplePages(
          2025,
          tracksPerGenre,
          genres[g],
        );
        allTracks.push(...(genreTracks as SpotifyTrack[]));
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch {
        // Skip failed genre requests
      }
    }

    const uniqueTracks = Array.from(
      new Map(allTracks.map((track) => [track.id, track])).values(),
    );

    console.log(`✓ Fetched ${uniqueTracks.length} unique tracks`);
    console.log('💾 Starting import process...');

    for (const track of uniqueTracks) {
      try {
        const existingSong = await songRepository.findOne({
          where: { title: track.name },
        });
        if (existingSong) {
          totalSkipped++;
          continue;
        }

        const artistName = track.artists[0]?.name || 'Unknown Artist';
        let artist = await artistRepository.findOne({
          where: { name: artistName },
        });

        if (!artist) {
          artist = artistRepository.create({
            name: artistName,
            country: 'Unknown',
            genre: 'Pop',
            imageUrl:
              track.album.images.find((img) => img.height === 300)?.url || '',
          });
          await artistRepository.save(artist);
        }

        const imageUrl =
          track.album.images.find((img) => img.height === 300)?.url ||
          track.album.images[0]?.url ||
          '';

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

        // Only count as imported if embeddings are successfully generated
        const embeddingsGenerated = await generateEmbeddingsForSong(
          song,
          artist,
          songRepository,
        );
        if (embeddingsGenerated) {
          totalImported++;
        } else {
          // Remove song if embeddings failed
          await songRepository.remove(song);
          totalSkipped++;
        }
      } catch {
        totalSkipped++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 Summary:');
    console.log(`   Imported: ${totalImported}`);
    console.log(`   Skipped:  ${totalSkipped}`);
    console.log('='.repeat(50));

    if (totalImported > 0) {
      console.log('✅ Import completed with embeddings!');
    } else {
      console.log('⚠️  No new tracks imported');
    }
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
