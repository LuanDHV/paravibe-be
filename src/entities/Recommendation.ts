import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Song } from './Song';

@Index('song_id', ['songId'], {})
@Index('similar_song_id', ['similarSongId'], {})
@Entity('Recommendation', { schema: 'paravibe_db' })
export class Recommendation {
  @PrimaryGeneratedColumn({ type: 'int', name: 'rec_id' })
  recId: number;

  @Column('int', { name: 'song_id' })
  songId: number;

  @Column('int', { name: 'similar_song_id' })
  similarSongId: number;

  @Column('float', { name: 'score', nullable: true, precision: 12 })
  score: number | null;

  @Column('timestamp', { name: 'computed_at', nullable: true })
  computedAt: Date | null;

  @ManyToOne(() => Song, (song) => song.recommendations, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'song_id', referencedColumnName: 'songId' }])
  song: Song;

  @ManyToOne(() => Song, (song) => song.recommendations2, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'similar_song_id', referencedColumnName: 'songId' }])
  similarSong: Song;
}
