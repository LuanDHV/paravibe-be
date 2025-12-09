// Cấu hình Spotify API
// Configuration for Spotify API integration
export const spotifyConfig = {
  // ID ứng dụng Spotify
  clientId: process.env.SPOTIFY_CLIENT_ID,
  // Secret key của ứng dụng Spotify
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  // URL API chính của Spotify
  apiBaseUrl: 'https://api.spotify.com/v1',
  // URL để lấy access token
  authUrl: 'https://accounts.spotify.com/api/token',
};
