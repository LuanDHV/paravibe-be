import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Recommendation } from '../../entities/Recommendation';
import { Song } from '../../entities/Song';
import { User } from '../../entities/User';
import { UserHistory } from '../../entities/UserHistory';
import { TopKRecommendationDto } from './dtos/recommendation-response.dto';
import { AIRecommendationResponse } from './interfaces/ai-response.interface';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

@Injectable()
export class RecommendationsService {
  private aiServiceUrl: string;

  constructor(
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserHistory)
    private historyRepository: Repository<UserHistory>,
    private configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  async getRecommendationsBySong(
    songId: number,
    topK: number = 5,
  ): Promise<TopKRecommendationDto[]> {
    // Lấy gợi ý bài hát tương tự dựa trên audio + metadata embeddings
    // Kiểm tra bài hát tồn tại
    const song = await this.songRepository.findOne({
      where: { songId },
      relations: ['artist'],
    });

    if (!song) {
      throw new NotFoundException('Song not found');
    }

    // Thử lấy gợi ý đã cache từ database
    const cachedRecs = await this.recommendationRepository.find({
      where: { songId },
      order: { score: 'DESC' },
      take: topK,
    });

    if (cachedRecs.length > 0) {
      const result = await Promise.all(
        cachedRecs
          .filter((rec) => rec.score !== null)
          .map(async (rec) => {
            const similarSong = await this.songRepository.findOne({
              where: { songId: rec.similarSongId },
              relations: ['artist'],
            });
            return this.formatTopKRecommendation(
              similarSong,
              rec.score as number,
            );
          }),
      );
      return result;
    }

    // Nếu không có gợi ý đã cache, gọi Python service
    // Python API: GET /api/v1/embed/recommend/song/{song_id}?top_k={top_k}
    try {
      const response = await fetch(
        `${this.aiServiceUrl}/api/v1/embed/recommend/song/${songId}?top_k=${topK}`,
        {
          method: 'GET',
        },
      );

      if (!response.ok) {
        throw new Error('AI Service error');
      }

      const data: AIRecommendationResponse = await response.json();
      const recommendations = data.recommendations;

      // Cache gợi ý vào database
      for (const rec of recommendations) {
        await this.recommendationRepository.save({
          songId,
          similarSongId: rec.song_id,
          score: rec.score,
          computedAt: new Date(),
        } as any);
      }

      // Định dạng và trả về
      const result = await Promise.all(
        recommendations.map(async (rec: any) => {
          const similarSong = await this.songRepository.findOne({
            where: { songId: rec.song_id },
            relations: ['artist'],
          });
          return this.formatTopKRecommendation(
            similarSong,
            rec.score as number,
          );
        }),
      );

      return result;
    } catch {
      throw new HttpException(
        'Failed to fetch recommendations from AI service',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getRecommendationsByUser(
    userId: number,
    topK: number = 5,
  ): Promise<TopKRecommendationDto[]> {
    // Lấy gợi ý bài hát dựa trên lịch sử nghe nhạc của user
    // Kiểm tra user tồn tại
    const user = await this.userRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Lấy bài hát nghe gần nhất của user từ lịch sử
    const recentHistory = await this.historyRepository.findOne({
      where: { userId },
      order: { listenedAt: 'DESC' },
    });

    if (!recentHistory) {
      return []; // Không có gợi ý nếu user chưa có lịch sử nghe
    }

    // Lấy gợi ý dựa trên bài hát nghe gần nhất
    return this.getRecommendationsBySong(recentHistory.songId, topK);
  }

  async recomputeRecommendations(): Promise<{
    message: string;
    count: number;
  }> {
    // Xóa cache gợi ý - AI service sẽ tính toán lại theo yêu cầu
    const deletedCount = await this.recommendationRepository.delete({});

    return {
      message:
        'Cached recommendations cleared. New recommendations will be computed on demand.',
      count: deletedCount.affected || 0,
    };
  }

  private formatTopKRecommendation(
    song: Song | null | undefined,
    score: number,
  ): TopKRecommendationDto {
    return {
      songId: song?.songId || 0,
      title: song?.title || '',
      artistName: song?.artist?.name || '',
      genre: song?.genre || undefined,
      score,
    };
  }

  // Các methods AI service integration
  async embedAudio(audioUrl: string): Promise<{
    embedding: number[];
    processing_time: number;
  }> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/api/v1/embed/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_url: audioUrl }),
      });

      if (!response.ok) {
        throw new HttpException(
          'Failed to embed audio',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      return (await response.json()) as {
        embedding: number[];
        processing_time: number;
      };
    } catch {
      throw new HttpException(
        'AI Service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async embedMetadata(metadataText: string): Promise<{
    embedding: number[];
    processing_time: number;
  }> {
    try {
      const response = await fetch(
        `${this.aiServiceUrl}/api/v1/embed/metadata`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: metadataText.split('\n')[0],
            artist: metadataText.split('\n')[1],
            genre: metadataText.split('\n')[2],
          }),
        },
      );

      if (!response.ok) {
        throw new HttpException(
          'Failed to embed metadata',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      return (await response.json()) as {
        embedding: number[];
        processing_time: number;
      };
    } catch {
      throw new HttpException(
        'AI Service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async checkAIServiceHealth(): Promise<{ status: string }> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/api/v1/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        return { status: 'unhealthy' };
      }

      return (await response.json()) as { status: string };
    } catch {
      return { status: 'unreachable' };
    }
  }
}
