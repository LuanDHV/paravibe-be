import { Module } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { SpotifyController } from './spotify.controller';
import { spotifyConfig } from '../../config/spotify.config';

// Module tích hợp Spotify API
// Module for Spotify API integration
@Module({
  providers: [
    {
      provide: SpotifyService,
      useFactory: () =>
        new SpotifyService(
          spotifyConfig.clientId || '',
          spotifyConfig.clientSecret || '',
        ),
    },
  ],
  controllers: [SpotifyController],
  exports: [SpotifyService],
})
export class SpotifyModule {}
