import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';
import { Song } from './Song';

@Index('user_id', ['userId'], {})
@Index('song_id', ['songId'], {})
@Entity('UserHistory', { schema: 'paravibe_db' })
export class UserHistory {
  @PrimaryGeneratedColumn({ type: 'int', name: 'history_id' })
  historyId: number;

  @Column('int', { name: 'user_id' })
  userId: number;

  @Column('int', { name: 'song_id' })
  songId: number;

  @Column('timestamp', { name: 'listened_at', nullable: true })
  listenedAt: Date | null;

  @Column('int', { name: 'duration_listened', nullable: true })
  durationListened: number | null;

  @Column('varchar', {
    name: 'action',
    nullable: true,
    comment: 'Enum: play, skip, like',
    length: 255,
  })
  action: string | null;

  @ManyToOne(() => User, (user) => user.userHistories, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'userId' }])
  user: User;

  @ManyToOne(() => Song, (song) => song.userHistories, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'song_id', referencedColumnName: 'songId' }])
  song: Song;
}
