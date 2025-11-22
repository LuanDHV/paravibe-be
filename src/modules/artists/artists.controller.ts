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
import { ArtistsService } from './artists.service';
import { CreateArtistDto } from './dtos/create-artist.dto';
import { UpdateArtistDto } from './dtos/update-artist.dto';
import { ArtistResponseDto } from './dtos/artist-response.dto';
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

@ApiTags('artists')
@Controller('artists')
export class ArtistsController {
  constructor(private artistsService: ArtistsService) {}

  @Public()
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Get all artists' })
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
    description: 'Artists retrieved successfully',
    type: [ArtistResponseDto],
  })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.artistsService.findAll(page, limit);
  }

  @Public()
  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get artist by ID' })
  @ApiParam({ name: 'id', description: 'Artist ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Artist retrieved successfully',
    type: ArtistResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  findById(@Param('id', ParseIntPipe) artistId: number) {
    return this.artistsService.findById(artistId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new artist (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Artist created successfully',
    type: ArtistResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiBearerAuth('JWT-auth')
  create(@Body() createArtistDto: CreateArtistDto) {
    return this.artistsService.create(createArtistDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update artist (Admin only)' })
  @ApiParam({ name: 'id', description: 'Artist ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Artist updated successfully',
    type: ArtistResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  @ApiBearerAuth('JWT-auth')
  update(
    @Param('id', ParseIntPipe) artistId: number,
    @Body() updateArtistDto: UpdateArtistDto,
  ) {
    return this.artistsService.update(artistId, updateArtistDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete artist (Admin only)' })
  @ApiParam({ name: 'id', description: 'Artist ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Artist deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  @ApiBearerAuth('JWT-auth')
  delete(@Param('id', ParseIntPipe) artistId: number) {
    return this.artistsService.delete(artistId);
  }
}
