import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from '../../entities/Song';
import { Artist } from '../../entities/Artist';
import { CreateSongDto } from './dtos/create-song.dto';
import { UpdateSongDto } from './dtos/update-song.dto';
import { SearchSongsDto } from './dtos/search-songs.dto';
import { SongResponseDto } from './dtos/song-response.dto';

@Injectable()
export class SongsService {
  constructor(
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
    @InjectRepository(Artist)
    private artistRepository: Repository<Artist>,
  ) {}

  async create(createSongDto: CreateSongDto): Promise<SongResponseDto> {
    // Tạo bài hát mới
    const { artistId, ...songData } = createSongDto;

    // Kiểm tra nghệ sĩ tồn tại
    const artist = await this.artistRepository.findOne({
      where: { artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    const song = this.songRepository.create({
      ...songData,
      artistId,
    });

    const savedSong = await this.songRepository.save(song);
    savedSong.artist = artist;

    return this.formatSongResponse(savedSong);
  }

  async findById(songId: number): Promise<SongResponseDto> {
    // Lấy thông tin bài hát theo ID
    const song = await this.songRepository.findOne({
      where: { songId },
      relations: ['artist'],
    });

    if (!song) {
      throw new NotFoundException('Song not found');
    }

    return this.formatSongResponse(song);
  }

  async search(searchDto: SearchSongsDto): Promise<{
    data: SongResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Tìm kiếm bài hát theo tiêu đề, nghệ sĩ, hoặc thể loại
    const { q, title, artistId, genre, page = 1, limit = 10 } = searchDto;
    const skip = (page - 1) * limit;

    const query = this.songRepository
      .createQueryBuilder('song')
      .leftJoinAndSelect('song.artist', 'artist');

    // Tìm theo tiêu đề (từ q hoặc title)
    if (q) {
      query.andWhere('song.title LIKE :title', { title: `%${q}%` });
    }

    if (title) {
      query.andWhere('song.title LIKE :titleParam', {
        titleParam: `%${title}%`,
      });
    }

    if (artistId) {
      query.andWhere('song.artistId = :artistId', { artistId });
    }

    if (genre) {
      query.andWhere('song.genre LIKE :genre', { genre: `%${genre}%` });
    }

    query.skip(skip).take(limit).orderBy('song.createdAt', 'DESC');

    const [songs, total] = await query.getManyAndCount();

    return {
      data: songs.map((s) => this.formatSongResponse(s)),
      total,
      page,
      limit,
    };
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: SongResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Lấy danh sách tất cả bài hát (có phân trang)
    const skip = (page - 1) * limit;

    const [songs, total] = await this.songRepository.findAndCount({
      relations: ['artist'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: songs.map((s) => this.formatSongResponse(s)),
      total,
      page,
      limit,
    };
  }

  async update(
    songId: number,
    updateSongDto: UpdateSongDto,
  ): Promise<SongResponseDto> {
    // Cập nhật thông tin bài hát
    const song = await this.songRepository.findOne({
      where: { songId },
      relations: ['artist'],
    });

    if (!song) {
      throw new NotFoundException('Song not found');
    }

    if (updateSongDto.artistId) {
      const artist = await this.artistRepository.findOne({
        where: { artistId: updateSongDto.artistId },
      });

      if (!artist) {
        throw new NotFoundException('Artist not found');
      }

      song.artistId = updateSongDto.artistId;
    }

    Object.assign(song, updateSongDto);

    await this.songRepository.save(song);

    return this.formatSongResponse(song);
  }

  async delete(songId: number): Promise<{ message: string }> {
    // Xóa bài hát
    const song = await this.songRepository.findOne({
      where: { songId },
    });

    if (!song) {
      throw new NotFoundException('Song not found');
    }

    await this.songRepository.remove(song);

    return { message: 'Song deleted successfully' };
  }

  async getMetadata(songId: number): Promise<{ metadata: object | null }> {
    // Lấy metadata vector của bài hát
    const song = await this.songRepository.findOne({
      where: { songId },
      select: ['metadataVector'],
    });

    if (!song) {
      throw new NotFoundException('Song not found');
    }

    return { metadata: song.metadataVector || null };
  }

  private formatSongResponse(song: Song): SongResponseDto {
    return {
      songId: song.songId,
      title: song.title || '',
      artist: {
        artistId: song.artist.artistId,
        name: song.artist.name || '',
      },
      duration: song.duration || undefined,
      releaseDate: song.releaseDate || undefined,
      imageUrl: song.imageUrl || undefined,
      audioUrl: song.audioUrl || undefined,
      genre: song.genre || '',
      previewUrl: song.previewUrl || '',
      audioVector: song.audioVector
        ? (song.audioVector as number[])
        : undefined,
      metadataVector: song.metadataVector
        ? (song.metadataVector as number[])
        : undefined,
      createdAt: song.createdAt || new Date(),
    };
  }
}
