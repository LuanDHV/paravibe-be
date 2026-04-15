import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Playlist } from './Playlist';
import { Song } from './Song';

@Index('playlist_id', ['playlistId'], {})
@Index('song_id', ['songId'], {})
@Entity('PlaylistSong', { schema: 'paravibe_db' })
export class PlaylistSong {
  @PrimaryColumn('int', { name: 'playlist_id' })
  playlistId: number;

  @PrimaryColumn('int', { name: 'song_id' })
  songId: number;

  @Column('int', { name: 'order_idx', nullable: true })
  orderIdx: number | null;

  @ManyToOne(() => Playlist, (playlist) => playlist.playlistSongs, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'playlist_id', referencedColumnName: 'playlistId' }])
  playlist: Playlist;

  @ManyToOne(() => Song, (song) => song.playlistSongs, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'song_id', referencedColumnName: 'songId' }])
  song: Song;
}
