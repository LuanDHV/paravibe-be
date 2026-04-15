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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('playlists')
@Controller('playlists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PlaylistsController {
  constructor(private playlistsService: PlaylistsService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get playlists by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID', example: 1 })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per page',
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Playlists retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/PlaylistResponseDto' },
        },
        total: { type: 'number', example: 25 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Create a new playlist' })
  @ApiResponse({
    status: 201,
    description: 'Playlist created successfully',
    type: PlaylistResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPlaylist(
    @CurrentUser() user: UserPayload,
    @Body() createPlaylistDto: CreatePlaylistDto,
  ): Promise<PlaylistResponseDto> {
    return this.playlistsService.create(user.userId, createPlaylistDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get playlist by ID' })
  @ApiParam({ name: 'id', description: 'Playlist ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Playlist retrieved successfully',
    type: PlaylistResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Playlist not found' })
  async getPlaylist(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PlaylistResponseDto> {
    return this.playlistsService.findById(id);
  }

  @Post(':id/songs')
  @ApiOperation({ summary: 'Add song to playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID', example: 1 })
  @ApiResponse({
    status: 201,
    description: 'Song added to playlist successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Song added to playlist successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not playlist owner' })
  @ApiResponse({ status: 404, description: 'Playlist or song not found' })
  async addSongToPlaylist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() addSongToPlaylistDto: AddSongToPlaylistDto,
  ): Promise<{ message: string }> {
    return this.playlistsService.addSong(id, user.userId, addSongToPlaylistDto);
  }

  @Delete(':id/songs/:songId')
  @ApiOperation({ summary: 'Remove song from playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID', example: 1 })
  @ApiParam({ name: 'songId', description: 'Song ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Song removed from playlist successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Song removed from playlist successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not playlist owner' })
  @ApiResponse({ status: 404, description: 'Playlist or song not found' })
  async removeSongFromPlaylist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('songId', ParseIntPipe) songId: number,
  ): Promise<{ message: string }> {
    return this.playlistsService.removeSong(id, songId, user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Playlist updated successfully',
    type: PlaylistResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not playlist owner' })
  @ApiResponse({ status: 404, description: 'Playlist not found' })
  async updatePlaylist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePlaylistDto: UpdatePlaylistDto,
  ): Promise<PlaylistResponseDto> {
    return this.playlistsService.update(id, user.userId, updatePlaylistDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete playlist' })
  @ApiParam({ name: 'id', description: 'Playlist ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Playlist deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Playlist deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not playlist owner' })
  @ApiResponse({ status: 404, description: 'Playlist not found' })
  async deletePlaylist(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.playlistsService.delete(id, user.userId);
  }
}
