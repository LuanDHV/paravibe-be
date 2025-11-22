import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dtos/create-playlist.dto';
import { UpdatePlaylistDto } from './dtos/update-playlist.dto';
import { AddSongToPlaylistDto } from './dtos/add-song-to-playlist.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlaylistResponseDto } from './dtos/playlist-response.dto';
import { UserPayload } from '../../common/interfaces/user-payload.interface';

@Controller('playlists')
@UseGuards(JwtAuthGuard)
export class PlaylistsController {
  constructor(private playlistsService: PlaylistsService) {}

  @Get('user/:userId')
  async getPlaylistsByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: PlaylistResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.playlistsService.findByUser(userId, pageNum, limitNum);
  }

  @Post()
  async createPlaylist(
    @CurrentUser() user: UserPayload,
    @Body() createPlaylistDto: CreatePlaylistDto,
  ): Promise<PlaylistResponseDto> {
    return this.playlistsService.create(user.userId, createPlaylistDto);
  }

  @Get(':id')
  async getPlaylist(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PlaylistResponseDto> {
    return this.playlistsService.findById(id);
  }

  @Post(':id/songs')
  async addSongToPlaylist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() addSongToPlaylistDto: AddSongToPlaylistDto,
  ): Promise<{ message: string }> {
    return this.playlistsService.addSong(id, user.userId, addSongToPlaylistDto);
  }

  @Delete(':id/songs/:songId')
  async removeSongFromPlaylist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('songId', ParseIntPipe) songId: number,
  ): Promise<{ message: string }> {
    return this.playlistsService.removeSong(id, songId, user.userId);
  }

  @Put(':id')
  async updatePlaylist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePlaylistDto: UpdatePlaylistDto,
  ): Promise<PlaylistResponseDto> {
    return this.playlistsService.update(id, user.userId, updatePlaylistDto);
  }

  @Delete(':id')
  async deletePlaylist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.playlistsService.delete(id, user.userId);
  }
}
