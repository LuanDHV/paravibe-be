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
import {
  AIRecommendationResponse,
  AIRecomputeResponse,
} from './interfaces/ai-response.interface';

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
      'http://localhost:5000',
    );
  }

  async getRecommendationsBySong(
    songId: number,
    topK: number = 5,
  ): Promise<TopKRecommendationDto[]> {
    // Lấy gợi ý bài hát tương tự
    // Kiểm tra bài hát tồn tại
    const song = await this.songRepository.findOne({
      where: { songId },
      relations: ['artist'],
    });

    if (!song) {
      throw new NotFoundException('Song not found');
    }

    // Try to get cached recommendations from database
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

    // If no cached recommendations, call Python service
    try {
      const response = await fetch(`${this.aiServiceUrl}/similarity/song`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: songId, top_k: topK }),
      });

      if (!response.ok) {
        throw new Error('AI Service error');
      }

      const data: AIRecommendationResponse = await response.json();
      const recommendations = data.recommendations;

      // Cache recommendations in database
      for (const rec of recommendations) {
        await this.recommendationRepository.save({
          songId,
          similarSongId: rec.song_id,
          score: rec.score,
          computedAt: new Date(),
        } as any);
      }

      // Format and return
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

    // Get user's listening history
    const history = await this.historyRepository.find({
      where: { userId },
      order: { listenedAt: 'DESC' },
      take: 50, // Consider recent 50 songs
    });

    if (history.length === 0) {
      return []; // No recommendations if user has no history
    }

    const songIds = history.map((h) => h.songId);

    // Call Python service for user-based recommendations
    try {
      const response = await fetch(`${this.aiServiceUrl}/similarity/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_ids: songIds, top_k: topK }),
      });

      if (!response.ok) {
        throw new Error('AI Service error');
      }

      const data: AIRecommendationResponse = await response.json();
      const recommendations = data.recommendations;

      // Format and return
      const result = await Promise.all(
        recommendations.map(async (rec: any) => {
          const song = await this.songRepository.findOne({
            where: { songId: rec.song_id },
            relations: ['artist'],
          });
          return this.formatTopKRecommendation(song, rec.score as number);
        }),
      );

      return result;
    } catch {
      throw new HttpException(
        'Failed to fetch user recommendations from AI service',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async recomputeRecommendations(): Promise<{
    message: string;
    count: number;
  }> {
    // Tính toán lại tất cả các gợi ý bài hát từ dịch vụ AI
    try {
      // Gọi Python service để tính toán lại gợi ý
      const response = await fetch(`${this.aiServiceUrl}/recompute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('AI Service error');
      }

      const data: AIRecomputeResponse = await response.json();
      const count = data.count;

      // Clear old recommendations
      await this.recommendationRepository.delete({});

      return {
        message: 'Recommendations recomputed successfully',
        count,
      };
    } catch {
      throw new HttpException(
        'Failed to recompute recommendations',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
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
}
