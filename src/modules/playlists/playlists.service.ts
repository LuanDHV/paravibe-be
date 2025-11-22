import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Playlist } from '../../entities/Playlist';
import { PlaylistSong } from '../../entities/PlaylistSong';
import { Song } from '../../entities/Song';
import { CreatePlaylistDto } from './dtos/create-playlist.dto';
import { UpdatePlaylistDto } from './dtos/update-playlist.dto';
import { AddSongToPlaylistDto } from './dtos/add-song-to-playlist.dto';
import { PlaylistResponseDto } from './dtos/playlist-response.dto';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Playlist)
    private playlistRepository: Repository<Playlist>,
    @InjectRepository(PlaylistSong)
    private playlistSongRepository: Repository<PlaylistSong>,
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
  ) {}

  async create(
    userId: number,
    createPlaylistDto: CreatePlaylistDto,
  ): Promise<PlaylistResponseDto> {
    // Tạo danh sách phát mới
    const playlist = this.playlistRepository.create({
      userId,
      ...createPlaylistDto,
    });

    await this.playlistRepository.save(playlist);

    return this.formatPlaylistResponse(playlist, []);
  }

  async findByUser(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: PlaylistResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Lấy danh sách phát của user (có phân trang)

    const skip = (page - 1) * limit;

    const [playlists, total] = await this.playlistRepository.findAndCount({
      where: { userId },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const result = await Promise.all(
      playlists.map(async (p) => {
        const songs = await this.playlistSongRepository.find({
          where: { playlistId: p.playlistId },
          relations: ['song', 'song.artist'],
          order: { orderIdx: 'ASC' },
        });

        return this.formatPlaylistResponse(
          p,
          songs.map((ps) => ({
            songId: ps.song.songId,
            title: ps.song.title || '',
            artistName: ps.song.artist.name || '',
            genre: ps.song.genre || '',
          })),
        );
      }),
    );

    return {
      data: result,
      total,
      page,
      limit,
    };
  }

  async findById(playlistId: number): Promise<PlaylistResponseDto> {
    // Lấy thông tin danh sách phát theo ID
    const playlist = await this.playlistRepository.findOne({
      where: { playlistId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    const playlistSongs = await this.playlistSongRepository.find({
      where: { playlistId },
      relations: ['song', 'song.artist'],
      order: { orderIdx: 'ASC' },
    });

    const songs = playlistSongs.map((ps) => ({
      songId: ps.song.songId,
      title: ps.song.title || '',
      artistName: ps.song.artist.name || '',
      genre: ps.song.genre || '',
    }));

    return this.formatPlaylistResponse(playlist, songs);
  }

  async addSong(
    playlistId: number,
    userId: number,
    addSongDto: AddSongToPlaylistDto,
  ): Promise<{ message: string }> {
    // Thêm bài hát vào danh sách phát
    // Kiểm tra playlist thuộc về user
    const playlist = await this.playlistRepository.findOne({
      where: { playlistId, userId },
    });

    if (!playlist) {
      throw new ForbiddenException('You cannot add songs to this playlist');
    }

    // Kiểm tra bài hát tồn tại
    const song = await this.songRepository.findOne({
      where: { songId: addSongDto.songId },
    });

    if (!song) {
      throw new NotFoundException('Song not found');
    }

    // Tìm order_idx tiếp theo nếu không cung cấp
    let orderIdx = addSongDto.orderIdx ?? 0;

    if (addSongDto.orderIdx === undefined) {
      const lastSong = await this.playlistSongRepository.findOne({
        where: { playlistId },
        order: { orderIdx: 'DESC' },
      });
      orderIdx = (lastSong?.orderIdx ?? 0) + 1;
    }

    // Thêm song vào playlist
    await this.playlistSongRepository.save({
      playlistId,
      songId: addSongDto.songId,
      orderIdx,
    } as any);

    return { message: 'Song added to playlist successfully' };
  }

  async removeSong(
    playlistId: number,
    songId: number,
    userId: number,
  ): Promise<{ message: string }> {
    // Xóa bài hát khỏi danh sách phát
    // Kiểm tra playlist thuộc về user
    const playlist = await this.playlistRepository.findOne({
      where: { playlistId, userId },
    });

    if (!playlist) {
      throw new ForbiddenException(
        'You cannot remove songs from this playlist',
      );
    }

    const playlistSong = await this.playlistSongRepository.findOne({
      where: { playlistId, songId },
    });

    if (!playlistSong) {
      throw new NotFoundException('Song not found in playlist');
    }

    await this.playlistSongRepository.remove(playlistSong);

    return { message: 'Song removed from playlist successfully' };
  }

  async update(
    playlistId: number,
    userId: number,
    updatePlaylistDto: UpdatePlaylistDto,
  ): Promise<PlaylistResponseDto> {
    // Cập nhật thông tin danh sách phát
    const playlist = await this.playlistRepository.findOne({
      where: { playlistId, userId },
    });

    if (!playlist) {
      throw new ForbiddenException('You cannot update this playlist');
    }

    Object.assign(playlist, updatePlaylistDto);
    await this.playlistRepository.save(playlist);

    const songs = await this.playlistSongRepository.find({
      where: { playlistId },
      relations: ['song', 'song.artist'],
      order: { orderIdx: 'ASC' },
    });

    return this.formatPlaylistResponse(
      playlist,
      songs.map((ps) => ({
        songId: ps.song.songId,
        title: ps.song.title || '',
        artistName: ps.song.artist.name || '',
        genre: ps.song.genre || '',
      })),
    );
  }

  async delete(
    playlistId: number,
    userId: number,
  ): Promise<{ message: string }> {
    // Xóa danh sách phát
    const playlist = await this.playlistRepository.findOne({
      where: { playlistId, userId },
    });

    if (!playlist) {
      throw new ForbiddenException('You cannot delete this playlist');
    }

    // Delete all songs in playlist first
    await this.playlistSongRepository.delete({ playlistId });

    // Delete playlist
    await this.playlistRepository.remove(playlist);

    return { message: 'Playlist deleted successfully' };
  }

  private formatPlaylistResponse(
    playlist: Playlist,
    songs: Array<{
      songId: number;
      title: string;
      artistName: string;
      genre?: string;
    }>,
  ): PlaylistResponseDto {
    return {
      playlistId: playlist.playlistId,
      userId: playlist.userId,
      name: playlist.name || '',
      description: playlist.description || undefined,
      isPublic: playlist.isPublic || false,
      createdAt: playlist.createdAt || new Date(),
      songs,
    };
  }
}
