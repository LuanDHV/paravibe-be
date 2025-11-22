import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Artist } from '../../entities/Artist';
import { CreateArtistDto } from './dtos/create-artist.dto';
import { UpdateArtistDto } from './dtos/update-artist.dto';
import { ArtistResponseDto } from './dtos/artist-response.dto';

@Injectable()
export class ArtistsService {
  constructor(
    @InjectRepository(Artist)
    private artistRepository: Repository<Artist>,
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

  private formatArtistResponse(artist: Artist): ArtistResponseDto {
    return {
      artistId: artist.artistId,
      name: artist.name || '',
      country: artist.country || undefined,
    };
  }
}
