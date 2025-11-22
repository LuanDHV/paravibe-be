import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { TopKRecommendationDto } from './dtos/recommendation-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private recommendationsService: RecommendationsService) {}

  @Get('song/:songId')
  @HttpCode(200)
  async getRecommendationsBySong(
    @Param('songId', ParseIntPipe) songId: number,
    @Query('topK') topK?: string,
  ): Promise<TopKRecommendationDto[]> {
    const topKNum = topK ? parseInt(topK, 10) : 5;
    return this.recommendationsService.getRecommendationsBySong(
      songId,
      topKNum,
    );
  }

  @Get('user/:userId')
  @HttpCode(200)
  async getRecommendationsByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('topK') topK?: string,
  ): Promise<TopKRecommendationDto[]> {
    const topKNum = topK ? parseInt(topK, 10) : 5;
    return this.recommendationsService.getRecommendationsByUser(
      userId,
      topKNum,
    );
  }

  @Post('admin/recompute')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(200)
  async recomputeRecommendations(): Promise<{
    message: string;
    count: number;
  }> {
    return this.recommendationsService.recomputeRecommendations();
  }
}
