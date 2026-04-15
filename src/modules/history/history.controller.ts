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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('history')
@Controller('users/:userId/history')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class HistoryController {
  constructor(private historyService: HistoryService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Record user listening activity' })
  @ApiParam({ name: 'userId', description: 'User ID', example: 1 })
  @ApiResponse({
    status: 201,
    description: 'Listening activity recorded successfully',
    type: HistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or song not found' })
  async recordListening(
    @CurrentUser() user: any,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() createHistoryDto: CreateHistoryDto,
  ): Promise<HistoryResponseDto> {
    return this.historyService.recordListening(userId, createHistoryDto);
  }

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Get user listening history' })
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
    description: 'History retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/HistoryResponseDto' },
        },
        total: { type: 'number', example: 25 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Get user top songs by play count' })
  @ApiParam({ name: 'userId', description: 'User ID', example: 1 })
  @ApiQuery({
    name: 'limit',
    description: 'Number of top songs to return',
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Top songs retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          songId: { type: 'number', example: 1 },
          title: { type: 'string', example: 'Bohemian Rhapsody' },
          artistName: { type: 'string', example: 'Queen' },
          playCount: { type: 'number', example: 15 },
          totalDuration: { type: 'number', example: 2700 },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
