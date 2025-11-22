export class PlaylistResponseDto {
  playlistId: number;
  userId: number;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: Date;
  songs?: Array<{
    songId: number;
    title: string;
    artistName: string;
    genre?: string;
  }>;
}
