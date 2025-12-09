import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Song } from '../../entities/Song';
import { Artist } from '../../entities/Artist';

// Interface cho AI Service Response
// Interface for AI Service Response
interface AIEmbeddingResponse {
  audio_embedding?: number[];
  lyric_embedding?: number[];
  error?: string;
}

// Service để quản lý embeddings
// Service for managing embeddings
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly aiServiceUrl: string;

  constructor(
    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>,
  ) {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Sinh embeddings cho tất cả bài hát chưa có embeddings
   * Generate embeddings for all songs without embeddings
   */
  async generateAllEmbeddings(): Promise<{
    total: number;
    success: number;
    failed: number;
  }> {
    try {
      // Lấy tất cả bài hát chưa có embeddings
      // Get all songs without embeddings
      const songs = await this.songRepository
        .createQueryBuilder('song')
        .where('song.audioVector IS NULL OR song.lyricVector IS NULL')
        .leftJoinAndSelect('song.artist', 'artist')
        .getMany();

      this.logger.log(`Found ${songs.length} songs without embeddings`);

      let success = 0;
      let failed = 0;

      for (const song of songs) {
        try {
          await this.generateEmbeddingForSong(song.songId);
          success++;
        } catch (error) {
          this.logger.error(
            `Failed to generate embedding for song ${song.songId}: ${(error as Error).message}`,
          );
          failed++;
        }

        // Delay để tránh quá tải AI Service
        // Delay to avoid overloading AI Service
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      return {
        total: songs.length,
        success,
        failed,
      };
    } catch (error) {
      this.logger.error('Failed to generate all embeddings:', error);
      throw new HttpException(
        'Failed to generate embeddings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sinh embeddings cho một bài hát cụ thể
   * Generate embeddings for a specific song
   */
  async generateEmbeddingForSong(songId: number): Promise<{
    songId: number;
    audioEmbedding: boolean;
    lyricEmbedding: boolean;
  }> {
    try {
      // Lấy thông tin bài hát
      // Get song information
      const song = await this.songRepository.findOne({
        where: { songId },
        relations: ['artist'],
      });

      if (!song) {
        throw new HttpException('Song not found', HttpStatus.NOT_FOUND);
      }

      // Chuẩn bị dữ liệu để gửi tới AI Service
      // Prepare data to send to AI Service
      const requestData: {
        audio_url?: string;
        lyrics?: string;
        title?: string;
        artist?: string;
      } = {};

      // Nếu có audio URL (preview từ Spotify hoặc audio_url)
      // If audio URL exists (Spotify preview or audio_url)
      if (song.previewUrl) {
        requestData.audio_url = song.previewUrl;
      } else if (song.audioUrl) {
        requestData.audio_url = song.audioUrl;
      }

      // Nếu có lyrics
      // If lyrics exist
      if (song.lyrics && song.lyrics.trim() !== '') {
        requestData.lyrics = song.lyrics;
      }

      // Thêm thông tin bài hát
      // Add song info
      requestData.title = song.title || '';
      requestData.artist = song.artist?.name || '';

      // Kiểm tra xem có dữ liệu để xử lý không
      // Check if there's data to process
      if (!requestData.audio_url && !requestData.lyrics) {
        throw new HttpException(
          'No audio URL or lyrics available for this song',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Gọi AI Service để sinh embeddings
      // Call AI Service to generate embeddings
      const response = await axios.post<AIEmbeddingResponse>(
        `${this.aiServiceUrl}/generate-embeddings`,
        requestData,
        {
          timeout: 60000, // 60 seconds
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      // Cập nhật vectors vào database
      // Update vectors to database
      const updateData: {
        audioVector?: object;
        lyricVector?: object;
      } = {};

      let hasAudioEmbedding = false;
      let hasLyricEmbedding = false;

      if (response.data.audio_embedding) {
        updateData.audioVector = response.data.audio_embedding;
        hasAudioEmbedding = true;
      }

      if (response.data.lyric_embedding) {
        updateData.lyricVector = response.data.lyric_embedding;
        hasLyricEmbedding = true;
      }

      if (Object.keys(updateData).length > 0) {
        await this.songRepository.update(songId, updateData);
        this.logger.log(`Generated embeddings for song ${songId}`);
      }

      return {
        songId,
        audioEmbedding: hasAudioEmbedding,
        lyricEmbedding: hasLyricEmbedding,
      };
    } catch (error) {
      this.logger.error(`Failed to generate embedding for song ${songId}:`, error);
      throw new HttpException(
        'Failed to generate embedding',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cập nhật lyrics cho bài hát và sinh embedding
   * Update lyrics for song and generate embedding
   */
  async updateLyricsAndGenerate(
    songId: number,
    lyrics: string,
  ): Promise<{
    songId: number;
    lyricsUpdated: boolean;
    embeddingGenerated: boolean;
  }> {
    try {
      // Cập nhật lyrics
      // Update lyrics
      await this.songRepository.update(songId, { lyrics });

      // Sinh embedding
      // Generate embedding
      const result = await this.generateEmbeddingForSong(songId);

      return {
        songId,
        lyricsUpdated: true,
        embeddingGenerated: result.lyricEmbedding,
      };
    } catch (error) {
      this.logger.error('Failed to update lyrics and generate embedding:', error);
      throw new HttpException(
        'Failed to update lyrics and generate embedding',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Kiểm tra trạng thái embeddings
   * Check embeddings status
   */
  async getEmbeddingsStatus(): Promise<{
    total: number;
    withAudioEmbedding: number;
    withLyricEmbedding: number;
    withBothEmbeddings: number;
    withoutEmbeddings: number;
  }> {
    try {
      // Tổng số bài hát
      // Total songs
      const total = await this.songRepository.count();

      // Bài hát có audio embedding
      // Songs with audio embedding
      const withAudioEmbedding = await this.songRepository
        .createQueryBuilder('song')
        .where('song.audioVector IS NOT NULL')
        .getCount();

      // Bài hát có lyric embedding
      // Songs with lyric embedding
      const withLyricEmbedding = await this.songRepository
        .createQueryBuilder('song')
        .where('song.lyricVector IS NOT NULL')
        .getCount();

      // Bài hát có cả 2 embeddings
      // Songs with both embeddings
      const withBothEmbeddings = await this.songRepository
        .createQueryBuilder('song')
        .where('song.audioVector IS NOT NULL')
        .andWhere('song.lyricVector IS NOT NULL')
        .getCount();

      // Bài hát chưa có embeddings
      // Songs without embeddings
      const withoutEmbeddings = await this.songRepository
        .createQueryBuilder('song')
        .where('song.audioVector IS NULL')
        .andWhere('song.lyricVector IS NULL')
        .getCount();

      return {
        total,
        withAudioEmbedding,
        withLyricEmbedding,
        withBothEmbeddings,
        withoutEmbeddings,
      };
    } catch (error) {
      this.logger.error('Failed to get embeddings status:', error);
      throw new HttpException(
        'Failed to get embeddings status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
