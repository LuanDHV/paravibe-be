import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';

@Index('user_id', ['userId'], {})
@Entity('UserToken', { schema: 'paravibe_db' })
export class UserToken {
  @PrimaryGeneratedColumn({ type: 'int', name: 'token_id' })
  tokenId: number;

  @Column('int', { name: 'user_id' })
  userId: number;

  @Column('varchar', {
    name: 'refresh_token',
    nullable: true,
    comment: 'Hashed refresh token',
    length: 255,
  })
  refreshToken: string | null;

  @Column('timestamp', { name: 'issued_at', nullable: true })
  issuedAt: Date | null;

  @Column('timestamp', { name: 'expires_at', nullable: true })
  expiresAt: Date | null;

  @Column('tinyint', { name: 'revoked', nullable: true, width: 1 })
  revoked: boolean | null;

  @ManyToOne(() => User, (user) => user.userTokens, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'userId' }])
  user: User;
}
