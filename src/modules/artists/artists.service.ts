import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Artist } from '../../entities/Artist';
import { UserHistory } from '../../entities/UserHistory';
import { CreateArtistDto } from './dtos/create-artist.dto';
import { UpdateArtistDto } from './dtos/update-artist.dto';
import { ArtistResponseDto } from './dtos/artist-response.dto';
import { TopArtistResponseDto } from './dtos/top-artist-response.dto';

@Injectable()
export class ArtistsService {
  constructor(
    @InjectRepository(Artist)
    private artistRepository: Repository<Artist>,
    @InjectRepository(UserHistory)
    private historyRepository: Repository<UserHistory>,
  ) {}

  async create(createArtistDto: CreateArtistDto): Promise<ArtistResponseDto> {
    // Tạo nghệ sĩ mới
    const artist = this.artistRepository.create(createArtistDto);
    await this.artistRepository.save(artist);
    return this.formatArtistResponse(artist);
  }

  async findById(artistId: number): Promise<ArtistResponseDto> {
    // Lấy thông tin nghệ sĩ theo ID
    const artist = await this.artistRepository.findOne({
      where: { artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    return this.formatArtistResponse(artist);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: ArtistResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Lấy danh sách tất cả nghệ sĩ (có phân trang)
    const skip = (page - 1) * limit;

    const [artists, total] = await this.artistRepository.findAndCount({
      skip,
      take: limit,
    });

    return {
      data: artists.map((a) => this.formatArtistResponse(a)),
      total,
      page,
      limit,
    };
  }

  async update(
    artistId: number,
    updateArtistDto: UpdateArtistDto,
  ): Promise<ArtistResponseDto> {
    // Cập nhật thông tin nghệ sĩ
    const artist = await this.artistRepository.findOne({
      where: { artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    Object.assign(artist, updateArtistDto);
    await this.artistRepository.save(artist);

    return this.formatArtistResponse(artist);
  }

  async delete(artistId: number): Promise<{ message: string }> {
    // Xóa nghệ sĩ
    const artist = await this.artistRepository.findOne({
      where: { artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    await this.artistRepository.remove(artist);

    return { message: 'Artist deleted successfully' };
  }

  async getTopArtists(
    limit: number = 20,
    period?: 'week' | 'month' | 'year' | 'all',
  ): Promise<{
    data: TopArtistResponseDto[];
    total: number;
  }> {
    // Lấy danh sách nghệ sĩ được nghe nhiều nhất dựa trên lịch sử nghe
    let minDate: Date | undefined;

    if (period === 'week') {
      minDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      minDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      minDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    }

    // Lấy thống kê từ UserHistory
    let queryBuilder = this.historyRepository
      .createQueryBuilder('uh')
      .select('a.artistId', 'artistId')
      .addSelect('a.name', 'name')
      .addSelect('a.country', 'country')
      .addSelect('a.bio', 'bio')
      .addSelect('a.genre', 'genre')
      .addSelect('a.imageUrl', 'imageUrl')
      .addSelect('COUNT(uh.songId)', 'playCount')
      .addSelect('SUM(uh.durationListened)', 'totalDuration')
      .addSelect('COUNT(DISTINCT uh.songId)', 'songCount')
      .innerJoin('uh.song', 's', 's.songId = uh.songId')
      .innerJoin('s.artist', 'a', 'a.artistId = s.artistId')
      .where('uh.action = :action', { action: 'PLAY' });

    if (minDate) {
      queryBuilder = queryBuilder.andWhere('uh.listenedAt >= :date', {
        date: minDate,
      });
    }

    const artistStats = await queryBuilder
      .groupBy('a.artistId')
      .addGroupBy('a.name')
      .addGroupBy('a.country')
      .addGroupBy('a.bio')
      .addGroupBy('a.genre')
      .addGroupBy('a.imageUrl')
      .orderBy('COUNT(uh.songId)', 'DESC')
      .addOrderBy('SUM(uh.durationListened)', 'DESC')
      .limit(limit)
      .getRawMany();

    // Format response
    const topArtists = artistStats.map((r: Record<string, any>) => ({
      artistId: parseInt(r.artistId as string, 10),
      name: (r.name as string) || '',
      country: (r.country as string) || undefined,
      bio: (r.bio as string) || undefined,
      genre: (r.genre as string) || undefined,
      imageUrl: (r.imageUrl as string) || undefined,
      playCount: parseInt(r.playCount as string, 10),
      totalDuration: parseInt(r.totalDuration as string, 10) || 0,
      songCount: parseInt(r.songCount as string, 10),
    }));

    return {
      data: topArtists,
      total: topArtists.length,
    };
  }

  private formatArtistResponse(artist: Artist): ArtistResponseDto {
    return {
      artistId: artist.artistId,
      name: artist.name || '',
      country: artist.country || undefined,
      bio: artist.bio || undefined,
      genre: artist.genre || undefined,
      imageUrl: artist.imageUrl || undefined,
    };
  }
}
