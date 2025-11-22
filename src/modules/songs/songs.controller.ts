import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import { SongsService } from './songs.service';
import { CreateSongDto } from './dtos/create-song.dto';
import { UpdateSongDto } from './dtos/update-song.dto';
import { SearchSongsDto } from './dtos/search-songs.dto';
import { SongResponseDto } from './dtos/song-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('songs')
@Controller('songs')
export class SongsController {
  constructor(private songsService: SongsService) {}

  @Public()
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Search songs' })
  @ApiQuery({
    name: 'q',
    description: 'Search query',
    example: 'bohemian',
    required: false,
  })
  @ApiQuery({
    name: 'artistId',
    description: 'Filter by artist ID',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'genre',
    description: 'Filter by genre',
    example: 'Rock',
    required: false,
  })
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
    description: 'Songs retrieved successfully',
    type: [SongResponseDto],
  })
  search(@Query() searchDto: SearchSongsDto) {
    return this.songsService.search(searchDto);
  }

  @Public()
  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get song by ID' })
  @ApiParam({ name: 'id', description: 'Song ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Song retrieved successfully',
    type: SongResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Song not found' })
  getById(@Param('id', ParseIntPipe) songId: number) {
    return this.songsService.findById(songId);
  }

  @Public()
  @Get(':id/lyrics')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get song lyrics' })
  @ApiParam({ name: 'id', description: 'Song ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Lyrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        lyrics: { type: 'string', example: 'Is this the real life...' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Song not found' })
  getLyrics(@Param('id', ParseIntPipe) songId: number) {
    return this.songsService.getLyrics(songId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new song (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Song created successfully',
    type: SongResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiBearerAuth('JWT-auth')
  create(@Body() createSongDto: CreateSongDto) {
    return this.songsService.create(createSongDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update song (Admin only)' })
  @ApiParam({ name: 'id', description: 'Song ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Song updated successfully',
    type: SongResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @ApiBearerAuth('JWT-auth')
  update(
    @Param('id', ParseIntPipe) songId: number,
    @Body() updateSongDto: UpdateSongDto,
  ) {
    return this.songsService.update(songId, updateSongDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete song (Admin only)' })
  @ApiParam({ name: 'id', description: 'Song ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Song deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Song not found' })
  @ApiBearerAuth('JWT-auth')
  delete(@Param('id', ParseIntPipe) songId: number) {
    return this.songsService.delete(songId);
  }
}
