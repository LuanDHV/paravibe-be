import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserHistory } from '../../entities/UserHistory';
import { Song } from '../../entities/Song';
import { User } from '../../entities/User';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserHistory, Song, User])],
  providers: [HistoryService],
  controllers: [HistoryController],
  exports: [HistoryService],
})
export class HistoryModule {}
