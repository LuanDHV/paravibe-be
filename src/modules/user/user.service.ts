import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/User';
import { Role } from 'src/entities/Role';
import { Repository } from 'typeorm';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async findById(userId: number): Promise<UserResponseDto> {
    // Lấy thông tin user theo ID
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.formatUserResponse(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    // Tìm user theo email
    return await this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Lấy danh sách tất cả users (có phân trang)
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository.findAndCount({
      relations: ['role'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: users.map((u) => this.formatUserResponse(u)),
      total,
      page,
      limit,
    };
  }

  async update(
    userId: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    // Cập nhật thông tin user
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cập nhật tên nếu có
    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }

    // Cập nhật mật khẩu nếu có
    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Cập nhật trạng thái active nếu có
    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    // Cập nhật role nếu có
    if (updateUserDto.role) {
      const role = await this.roleRepository.findOne({
        where: { name: updateUserDto.role },
      });

      if (!role) {
        throw new NotFoundException(`Role '${updateUserDto.role}' not found`);
      }

      user.roleId = role.roleId;
      user.role = role;
    }

    await this.userRepository.save(user);

    return this.formatUserResponse(user);
  }

  async delete(userId: number): Promise<{ message: string }> {
    // Xóa user
    const user = await this.userRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Xóa dữ liệu liên quan trước (UserToken, UserHistory, Playlists, etc.)
    // Sử dụng raw query để xóa dữ liệu liên quan do foreign key constraint
    await this.userRepository.manager.query(
      'DELETE FROM `UserToken` WHERE `user_id` = ?',
      [userId],
    );

    await this.userRepository.manager.query(
      'DELETE FROM `UserHistory` WHERE `user_id` = ?',
      [userId],
    );

    await this.userRepository.manager.query(
      'DELETE FROM `PlaylistSong` WHERE `playlist_id` IN (SELECT `playlist_id` FROM `Playlist` WHERE `user_id` = ?)',
      [userId],
    );

    await this.userRepository.manager.query(
      'DELETE FROM `Playlist` WHERE `user_id` = ?',
      [userId],
    );

    // Cuối cùng xóa user
    await this.userRepository.remove(user);

    return { message: 'User deleted successfully' };
  }

  async toggleUserActive(
    userId: number,
    isActive: boolean,
  ): Promise<UserResponseDto> {
    // Bật/tắt trạng thái hoạt động của user
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = isActive;
    await this.userRepository.save(user);

    return this.formatUserResponse(user);
  }

  private formatUserResponse(user: User): UserResponseDto {
    return {
      userId: user.userId,
      name: user.name || '',
      email: user.email || '',
      role: {
        roleId: user.role.roleId,
        name: user.role.name || '',
      },
      isActive: user.isActive || false,
      createdAt: user.createdAt || new Date(),
      passwordHash: undefined,
      tokens: undefined,
    };
  }
}
