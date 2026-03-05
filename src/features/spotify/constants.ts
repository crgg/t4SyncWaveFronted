import { paths } from '@/routes/paths';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE = 'https://api.spotify.com';

export const SPOTIFY_CONFIG = {
  CLIENT_ID: import.meta.env.VITE_SPOTIFY_CLIENT_ID || '',
  REDIRECT_URI:
    typeof window !== 'undefined' ? `${window.location.origin}${paths.SPOTIFY_CALLBACK}` : '',
  SCOPES: [
    'user-read-email',
    'user-read-private',
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state',
  ].join(' '),
  AUTH_URL: `${SPOTIFY_AUTH_URL}/authorize`,
  TOKEN_URL: `${SPOTIFY_AUTH_URL}/api/token`,
  API_BASE: `${SPOTIFY_API_BASE}/v1`,
  redirectUriRemote: 'https://t4videocall.t4ever.com/spotify-oauth/callback',
} as const;

export const SPOTIFY_STORAGE_KEYS = {
  ACCESS_TOKEN: 't4syncwave:spotify_access_token',
  REFRESH_TOKEN: 't4syncwave:spotify_refresh_token',
  EXPIRES_AT: 't4syncwave:spotify_expires_at',
  PKCE_VERIFIER: 't4syncwave:spotify_pkce_verifier',
} as const;
