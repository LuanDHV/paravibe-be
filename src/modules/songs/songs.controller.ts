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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('songs')
export class SongsController {
  constructor(private songsService: SongsService) {}

  @Public()
  @Get()
  @HttpCode(200)
  search(@Query() searchDto: SearchSongsDto) {
    return this.songsService.search(searchDto);
  }

  @Public()
  @Get(':id')
  @HttpCode(200)
  getById(@Param('id', ParseIntPipe) songId: number) {
    return this.songsService.findById(songId);
  }

  @Public()
  @Get(':id/lyrics')
  @HttpCode(200)
  getLyrics(@Param('id', ParseIntPipe) songId: number) {
    return this.songsService.getLyrics(songId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(201)
  create(@Body() createSongDto: CreateSongDto) {
    return this.songsService.create(createSongDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(200)
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
  delete(@Param('id', ParseIntPipe) songId: number) {
    return this.songsService.delete(songId);
  }
}
