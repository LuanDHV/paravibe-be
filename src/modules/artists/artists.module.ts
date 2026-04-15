import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtistsService } from './artists.service';
import { ArtistsController } from './artists.controller';
import { Artist } from '../../entities/Artist';
import { UserHistory } from '../../entities/UserHistory';

@Module({
  imports: [TypeOrmModule.forFeature([Artist, UserHistory])],
  providers: [ArtistsService],
  controllers: [ArtistsController],
  exports: [ArtistsService],
})
export class ArtistsModule {}
