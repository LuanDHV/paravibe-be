import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/user/users.module';
import { SongsModule } from './modules/songs/songs.module';
import { ArtistsModule } from './modules/artists/artists.module';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { HistoryModule } from './modules/history/history.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { AppleMusicModule } from './modules/apple-music/apple-music.module';

// Entities
import { User } from './entities/User';
import { UserToken } from './entities/UserToken';
import { Role } from './entities/Role';
import { Artist } from './entities/Artist';
import { Song } from './entities/Song';
import { Playlist } from './entities/Playlist';
import { PlaylistSong } from './entities/PlaylistSong';
import { UserHistory } from './entities/UserHistory';
import { Recommendation } from './entities/Recommendation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER || 'paravibe',
      password: process.env.DB_PASS || 'mypass',
      database: process.env.DB_NAME || 'paravibe_db',
      entities: [
        User,
        UserToken,
        Role,
        Artist,
        Song,
        Playlist,
        PlaylistSong,
        UserHistory,
        Recommendation,
      ],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    SongsModule,
    ArtistsModule,
    PlaylistsModule,
    HistoryModule,
    RecommendationsModule,
    AppleMusicModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
