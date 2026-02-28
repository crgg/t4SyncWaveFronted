/**
 * Spotify integration constants
 * Requires VITE_SPOTIFY_CLIENT_ID in .env
 */

import { paths } from '@/routes/paths';

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
  AUTH_URL: 'https://accounts.spotify.com/authorize',
  TOKEN_URL: 'https://accounts.spotify.com/api/token',
  API_BASE: 'https://api.spotify.com/v1',
} as const;

export const SPOTIFY_STORAGE_KEYS = {
  ACCESS_TOKEN: 't4syncwave:spotify_access_token',
  REFRESH_TOKEN: 't4syncwave:spotify_refresh_token',
  EXPIRES_AT: 't4syncwave:spotify_expires_at',
  PKCE_VERIFIER: 't4syncwave:spotify_pkce_verifier',
} as const;
