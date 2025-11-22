/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/interfaces/user-payload.interface';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @HttpCode(200)
  getProfile(@CurrentUser() user: UserPayload) {
    return this.usersService.findById(user.userId);
  }

  @Get(':id')
  @HttpCode(200)
  getUser(@Param('id', ParseIntPipe) userId: number) {
    return this.usersService.findById(userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(200)
  getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Put(':id')
  @HttpCode(200)
  updateUser(
    @Param('id', ParseIntPipe) userId: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    // User chỉ có thể update chính mình, trừ Admin
    if (currentUser.userId !== userId && currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('You cannot update other user profile');
    }
    return this.usersService.update(userId, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(200)
  deleteUser(@Param('id', ParseIntPipe) userId: number) {
    return this.usersService.delete(userId);
  }

  @Put(':id/toggle-active')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(200)
  toggleUserActive(
    @Param('id', ParseIntPipe) userId: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.usersService.toggleUserActive(userId, isActive);
  }
}
