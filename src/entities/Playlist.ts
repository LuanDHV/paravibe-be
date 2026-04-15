import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';
import { PlaylistSong } from './PlaylistSong';

@Index('user_id', ['userId'], {})
@Entity('Playlist', { schema: 'paravibe_db' })
export class Playlist {
  @PrimaryGeneratedColumn({ type: 'int', name: 'playlist_id' })
  playlistId: number;

  @Column('int', { name: 'user_id' })
  userId: number;

  @Column('varchar', { name: 'name', nullable: true, length: 255 })
  name: string | null;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('timestamp', { name: 'created_at', nullable: true })
  createdAt: Date | null;

  @Column('tinyint', { name: 'is_public', nullable: true, width: 1 })
  isPublic: boolean | null;

  @ManyToOne(() => User, (user) => user.playlists, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'userId' }])
  user: User;

  @OneToMany(() => PlaylistSong, (playlistSong) => playlistSong.playlist)
  playlistSongs: PlaylistSong[];
}
