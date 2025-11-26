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

  @Column('text', { name: 'bio', nullable: true })
  bio: string | null;

  @Column('varchar', { name: 'genre', nullable: true, length: 100 })
  genre: string | null;

  @Column('varchar', { name: 'image_url', nullable: true, length: 500 })
  imageUrl: string | null;

  @OneToMany(() => Song, (song) => song.artist)
  songs: Song[];
}
