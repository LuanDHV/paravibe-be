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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RecommendationsController {
  constructor(private recommendationsService: RecommendationsService) {}

  @Get('song/:songId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get song recommendations by song ID' })
  @ApiParam({
    name: 'songId',
    description: 'Song ID to get recommendations for',
    example: 1,
  })
  @ApiQuery({
    name: 'topK',
    description: 'Number of recommendations to return',
    example: 5,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Recommendations retrieved successfully',
    type: [TopKRecommendationDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Song not found' })
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
  @ApiOperation({ summary: 'Get personalized recommendations for user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get recommendations for',
    example: 1,
  })
  @ApiQuery({
    name: 'topK',
    description: 'Number of recommendations to return',
    example: 5,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Recommendations retrieved successfully',
    type: [TopKRecommendationDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
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
  @ApiOperation({ summary: 'Recompute all recommendations (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Recommendations recomputed successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Recommendations recomputed successfully',
        },
        count: { type: 'number', example: 1000 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async recomputeRecommendations(): Promise<{
    message: string;
    count: number;
  }> {
    return this.recommendationsService.recomputeRecommendations();
  }
}
