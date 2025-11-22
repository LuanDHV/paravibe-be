import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Song } from './Song';

@Entity('Artist', { schema: 'paravibe_db' })
export class Artist {
  @PrimaryGeneratedColumn({ type: 'int', name: 'artist_id' })
  artistId: number;

  @Column('varchar', { name: 'name', nullable: true, length: 255 })
  name: string | null;

  @Column('varchar', { name: 'country', nullable: true, length: 255 })
  country: string | null;

  @OneToMany(() => Song, (song) => song.artist)
  songs: Song[];
}
