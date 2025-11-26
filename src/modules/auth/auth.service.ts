import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/User';
import { UserToken } from '../../entities/UserToken';
import { Role } from '../../entities/Role';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { AuthResponseDto } from './dtos/auth-response.dto';
import { ConfigService } from '@nestjs/config';
import { UserPayload } from '../../common/interfaces/user-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserToken)
    private userTokenRepository: Repository<UserToken>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    // Đăng ký user mới
    const { name, email, password } = registerDto;

    // Kiểm tra email đã tồn tại
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Lấy role mặc định (USER) - role_id = 1
    const userRole = await this.roleRepository.findOne({
      where: { roleId: 1 },
    });

    if (!userRole) {
      throw new BadRequestException('User role not found');
    }

    // Tạo user mới
    const user = this.userRepository.create({
      name,
      email,
      passwordHash,
      roleId: userRole.roleId,
      isActive: true,
    });

    await this.userRepository.save(user);

    return { message: 'User registered successfully' };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Đăng nhập user
    const { email, password } = loginDto;

    // Tìm user theo email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash || '',
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Tạo tokens (Access Token + Refresh Token)
    return await this.generateTokens(user);
  }

  async refresh(
    payload: UserPayload,
    refreshToken: string,
  ): Promise<AuthResponseDto> {
    // Làm mới token (refresh token)
    // Tìm user theo userId
    const user = await this.userRepository.findOne({
      where: { userId: payload.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Kiểm tra refresh token trong DB
    const userToken = await this.userTokenRepository.findOne({
      where: { userId: user.userId, revoked: false },
    });

    if (!userToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Kiểm tra hạn sử dụng token
    if (userToken.expiresAt && new Date() > userToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Xác minh mã token
    const isTokenValid = await bcrypt.compare(
      refreshToken,
      userToken.refreshToken || '',
    );

    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    userToken.revoked = true;
    await this.userTokenRepository.save(userToken);

    // Tạo token mới
    return await this.generateTokens(user);
  }

  async logout(userId: number): Promise<{ message: string }> {
    // Đăng xuất user - vô hiệu hóa tất cả refresh tokens
    await this.userTokenRepository.update(
      { userId, revoked: false },
      { revoked: true },
    );

    return { message: 'Logged out successfully' };
  }

  private async generateTokens(user: User): Promise<AuthResponseDto> {
    // Tạo Access Token và Refresh Token cho user
    // Lấy thông tin role của user
    const role = await this.roleRepository.findOne({
      where: { roleId: user.roleId },
    });

    if (!role) {
      throw new BadRequestException('User role not found');
    }

    const payload = {
      userId: user.userId,
      email: user.email,
      role: role.name,
    };

    // Access token
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'your-secret-key'),
      expiresIn: '15m',
    });

    // Refresh token
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        'your-refresh-secret',
      ),
      expiresIn: '7d',
    });

    // Hash và lưu refresh token vào DB
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 ngày

    await this.userTokenRepository.save({
      userId: user.userId,
      refreshToken: hashedRefreshToken,
      expiresAt,
      revoked: false,
    } as any);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 phút = 900 giây
      tokenType: 'Bearer',
    };
  }
}
