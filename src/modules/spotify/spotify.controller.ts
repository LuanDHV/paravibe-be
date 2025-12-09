import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

// API Controller cho Spotify Integration
// API Controller for Spotify Integration
@Controller('api/v1/spotify')
export class SpotifyController {
  constructor(private readonly spotifyService: SpotifyService) {}

  /**
   * Tìm kiếm bài hát trên Spotify
   * Search songs on Spotify
   * @param query Từ khóa tìm kiếm / Search query string
   * @param limit Số kết quả trả về (mặc định: 50, tối đa: 50) / Number of results (default: 50, max: 50)
   * @param offset Vị trí bắt đầu phân trang / Pagination offset (default: 0)
   */
  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchTracks(
    @Query('q') query: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ): Promise<Record<string, unknown>> {
    if (!query) {
      return {
        success: false,
        message: 'Query parameter is required',
      };
    }

    const tracks = await this.spotifyService.searchTracks(
      query,
      Math.min(parseInt(limit) || 50, 50),
      parseInt(offset) || 0,
    );

    return {
      success: true,
      data: tracks,
      count: tracks.length,
    };
  }

  /**
   * Lấy bài hát trending từ một năm cụ thể
   * Get trending tracks from a specific year
   * Chỉ admin có quyền truy cập / Admin only endpoint
   */
  @Get('trending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getTrendingTracks(
    @Query('year') year: string,
    @Query('genre') genre: string = 'pop',
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ): Promise<Record<string, unknown>> {
    if (!year) {
      return {
        success: false,
        message: 'Year parameter is required',
      };
    }

    const tracks = await this.spotifyService.getTrendingTracks(
      parseInt(year),
      genre,
      Math.min(parseInt(limit) || 50, 50),
      parseInt(offset) || 0,
    );

    return {
      success: true,
      data: tracks,
      year: parseInt(year),
      genre,
      count: tracks.length,
    };
  }

  /**
   * Lấy thông tin bài hát được định dạng cho database
   * Get track details formatted for database
   */
  @Get('format/:spotifyId')
  @UseGuards(JwtAuthGuard)
  async getFormattedTrack(@Query('spotifyId') spotifyId: string) {
    if (!spotifyId) {
      return {
        success: false,
        message: 'Spotify ID is required',
      };
    }

    const tracks = await this.spotifyService.searchTracks(spotifyId, 1, 0);

    if (!tracks || tracks.length === 0) {
      return {
        success: false,
        message: 'Track not found',
      };
    }

    const formatted = this.spotifyService.formatTrackForDatabase(tracks[0]);

    return {
      success: true,
      data: formatted,
    };
  }

  /**
   * Kiểm tra trạng thái dịch vụ Spotify
   * Health check endpoint
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    try {
      await this.spotifyService.ensureTokenValid();
      return {
        success: true,
        message: 'Spotify service is healthy',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Spotify service is unavailable',
        error: (error as Error).message,
      };
    }
  }
}
