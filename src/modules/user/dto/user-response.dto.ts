import { Exclude } from 'class-transformer';

export class UserResponseDto {
  userId: number;
  name: string;
  email: string;
  role: {
    roleId: number;
    name: string;
  };
  isActive: boolean;
  createdAt: Date;

  @Exclude()
  passwordHash?: string;

  @Exclude()
  tokens?: any[];
}
