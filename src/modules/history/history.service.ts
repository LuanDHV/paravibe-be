import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserHistory } from '../../entities/UserHistory';
import { Song } from '../../entities/Song';
import { CreateHistoryDto, HistoryAction } from './dtos/create-history.dto';
import { HistoryResponseDto } from './dtos/history-response.dto';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(UserHistory)
    private historyRepository: Repository<UserHistory>,
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
  ) {}

  async recordListening(
    userId: number,
    createHistoryDto: CreateHistoryDto,
  ): Promise<HistoryResponseDto> {
    // Ghi nhận lịch sử nghe nhạc của user
    const song = await this.songRepository.findOne({
      where: { songId: createHistoryDto.songId },
      relations: ['artist'],
    });

    const history = this.historyRepository.create({
      userId,
      songId: createHistoryDto.songId,
      listenedAt: createHistoryDto.playedAt
        ? new Date(createHistoryDto.playedAt)
        : new Date(),
      durationListened: createHistoryDto.durationListened ?? 0,
      action: createHistoryDto.action ?? HistoryAction.PLAY,
    });

    await this.historyRepository.save(history);

    return this.formatHistoryResponse(history, song);
  }

  async getHistoryByUser(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: HistoryResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Lấy lịch sử nghe nhạc của user (có phân trang)
    const skip = (page - 1) * limit;

    const [histories, total] = await this.historyRepository.findAndCount({
      where: { userId },
      skip,
      take: limit,
      order: { listenedAt: 'DESC' },
    });

    const result = await Promise.all(
      histories.map(async (h) => {
        const song = await this.songRepository.findOne({
          where: { songId: h.songId },
          relations: ['artist'],
        });
        return this.formatHistoryResponse(h, song);
      }),
    );

    return {
      data: result,
      total,
      page,
      limit,
    };
  }

  async getTopSongsByUser(
    userId: number,
    limit: number = 10,
  ): Promise<
    Array<{
      songId: number;
      title: string;
      artistName: string;
      playCount: number;
      totalDuration: number;
    }>
  > {
    // Lấy danh sách bài hát nghe nhiều nhất của user
    const result = await this.historyRepository
      .createQueryBuilder('uh')
      .select('uh.songId', 'songId')
      .addSelect('s.title', 'title')
      .addSelect('a.name', 'artistName')
      .addSelect('COUNT(uh.songId)', 'playCount')
      .addSelect('SUM(uh.durationListened)', 'totalDuration')
      .innerJoin('uh.song', 's', 's.songId = uh.songId')
      .leftJoin('s.artist', 'a', 'a.artistId = s.artistId')
      .where('uh.userId = :userId', { userId })
      .groupBy('uh.songId')
      .addGroupBy('s.title')
      .addGroupBy('a.name')
      .orderBy('COUNT(uh.songId)', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((r: Record<string, any>) => ({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      songId: parseInt(r.songId, 10),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      title: r.title || '',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      artistName: r.artistName || '',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      playCount: parseInt(r.playCount, 10),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      totalDuration: parseInt(r.totalDuration, 10) || 0,
    }));
  }

  private formatHistoryResponse(
    history: UserHistory,
    song?: Song | null,
  ): HistoryResponseDto {
    return {
      historyId: history.historyId,
      userId: history.userId,
      songId: history.songId,
      listenedAt: history.listenedAt || new Date(),
      durationListened: history.durationListened ?? undefined,
      action: (history.action as HistoryAction) ?? undefined,
      songTitle: song?.title || undefined,
      artistName: song?.artist?.name || undefined,
    };
  }
}
