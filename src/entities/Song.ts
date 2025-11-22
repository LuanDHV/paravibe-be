import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PlaylistSong } from './PlaylistSong';
import { Recommendation } from './Recommendation';
import { Artist } from './Artist';
import { UserHistory } from './UserHistory';

@Index('artist_id', ['artistId'], {})
@Entity('Song', { schema: 'paravibe_db' })
export class Song {
  @PrimaryGeneratedColumn({ type: 'int', name: 'song_id' })
  songId: number;

  @Column('varchar', { name: 'title', nullable: true, length: 255 })
  title: string | null;

  @Column('int', { name: 'artist_id' })
  artistId: number;

  @Column('varchar', { name: 'genre', nullable: true, length: 255 })
  genre: string | null;

  @Column('varchar', { name: 'preview_url', nullable: true, length: 255 })
  previewUrl: string | null;

  @Column('text', { name: 'lyrics', nullable: true })
  lyrics: string | null;

  @Column('json', { name: 'audio_vector', nullable: true, comment: 'nullable' })
  audioVector: object | null;

  @Column('json', { name: 'lyric_vector', nullable: true, comment: 'nullable' })
  lyricVector: object | null;

  @Column('timestamp', { name: 'created_at', nullable: true })
  createdAt: Date | null;

  @OneToMany(() => PlaylistSong, (playlistSong) => playlistSong.song)
  playlistSongs: PlaylistSong[];

  @OneToMany(() => Recommendation, (recommendation) => recommendation.song)
  recommendations: Recommendation[];

  @OneToMany(
    () => Recommendation,
    (recommendation) => recommendation.similarSong,
  )
  recommendations2: Recommendation[];

  @ManyToOne(() => Artist, (artist) => artist.songs, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'artist_id', referencedColumnName: 'artistId' }])
  artist: Artist;

  @OneToMany(() => UserHistory, (userHistory) => userHistory.song)
  userHistories: UserHistory[];
}
