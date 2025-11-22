import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SongsService } from './songs.service';
import { SongsController } from './songs.controller';
import { Song } from '../../entities/Song';
import { Artist } from '../../entities/Artist';

@Module({
  imports: [TypeOrmModule.forFeature([Song, Artist])],
  providers: [SongsService],
  controllers: [SongsController],
  exports: [SongsService],
})
export class SongsModule {}
