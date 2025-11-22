import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { CreateHistoryDto } from './dtos/create-history.dto';
import { HistoryResponseDto } from './dtos/history-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users/:userId/history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private historyService: HistoryService) {}

  @Post()
  @HttpCode(201)
  async recordListening(
    @CurrentUser() user: any,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() createHistoryDto: CreateHistoryDto,
  ): Promise<HistoryResponseDto> {
    return this.historyService.recordListening(userId, createHistoryDto);
  }

  @Get()
  @HttpCode(200)
  async getHistory(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: HistoryResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.historyService.getHistoryByUser(userId, pageNum, limitNum);
  }

  @Get('top-songs/all')
  @HttpCode(200)
  async getTopSongs(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit') limit?: string,
  ): Promise<
    Array<{
      songId: number;
      title: string;
      artistName: string;
      playCount: number;
      totalDuration: number;
    }>
  > {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.historyService.getTopSongsByUser(userId, limitNum);
  }
}
