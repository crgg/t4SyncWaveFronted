/**
 * Spotify OAuth 2.0 with PKCE (recommended for SPAs)
 */

import { SPOTIFY_CONFIG, SPOTIFY_STORAGE_KEYS } from './constants';

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (x) => possible[x % possible.length]).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(hashed);
  return { codeVerifier, codeChallenge };
}

export function getSpotifyAuthUrl(): string {
  if (!SPOTIFY_CONFIG.CLIENT_ID) {
    throw new Error('VITE_SPOTIFY_CLIENT_ID is not configured');
  }
  return `${SPOTIFY_CONFIG.AUTH_URL}?${new URLSearchParams({
    client_id: SPOTIFY_CONFIG.CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
    scope: SPOTIFY_CONFIG.SCOPES,
    code_challenge_method: 'S256',
    code_challenge: '', // Will be set before redirect
  }).toString()}`;
}

export async function initiateSpotifyLogin(): Promise<void> {
  const { codeVerifier, codeChallenge } = await generatePKCE();
  sessionStorage.setItem(SPOTIFY_STORAGE_KEYS.PKCE_VERIFIER, codeVerifier);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
    scope: SPOTIFY_CONFIG.SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  window.location.href = `${SPOTIFY_CONFIG.AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const codeVerifier = sessionStorage.getItem(SPOTIFY_STORAGE_KEYS.PKCE_VERIFIER);
  if (!codeVerifier) {
    throw new Error('PKCE verifier not found. Please try logging in again.');
  }

  const response = await fetch(SPOTIFY_CONFIG.TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
      client_id: SPOTIFY_CONFIG.CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error_description || err.error || 'Failed to exchange code for tokens');
  }

  const data = await response.json();
  sessionStorage.removeItem(SPOTIFY_STORAGE_KEYS.PKCE_VERIFIER);

  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem(SPOTIFY_STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  localStorage.setItem(SPOTIFY_STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  localStorage.setItem(SPOTIFY_STORAGE_KEYS.EXPIRES_AT, String(expiresAt));

  return data;
}

export async function refreshSpotifyToken(): Promise<string> {
  const refreshToken = localStorage.getItem(SPOTIFY_STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) {
    throw new Error('No refresh token. Please log in to Spotify again.');
  }

  const response = await fetch(SPOTIFY_CONFIG.TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: SPOTIFY_CONFIG.CLIENT_ID,
    }),
  });

  if (!response.ok) {
    localStorage.removeItem(SPOTIFY_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(SPOTIFY_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(SPOTIFY_STORAGE_KEYS.EXPIRES_AT);
    throw new Error('Failed to refresh Spotify token');
  }

  const data = await response.json();
  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem(SPOTIFY_STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  localStorage.setItem(SPOTIFY_STORAGE_KEYS.EXPIRES_AT, String(expiresAt));
  if (data.refresh_token) {
    localStorage.setItem(SPOTIFY_STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  }

  return data.access_token;
}

export function getSpotifyAccessToken(): string | null {
  return localStorage.getItem(SPOTIFY_STORAGE_KEYS.ACCESS_TOKEN);
}

export function isSpotifyTokenExpired(): boolean {
  const expiresAt = localStorage.getItem(SPOTIFY_STORAGE_KEYS.EXPIRES_AT);
  if (!expiresAt) return true;
  return Date.now() >= parseInt(expiresAt, 10) - 60000; // 1 min buffer
}

export async function getValidSpotifyToken(): Promise<string | null> {
  if (!SPOTIFY_CONFIG.CLIENT_ID) return null;
  if (isSpotifyTokenExpired()) {
    try {
      return await refreshSpotifyToken();
    } catch {
      return null;
    }
  }
  return getSpotifyAccessToken();
}

export function logoutSpotify(): void {
  localStorage.removeItem(SPOTIFY_STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(SPOTIFY_STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(SPOTIFY_STORAGE_KEYS.EXPIRES_AT);
  sessionStorage.removeItem(SPOTIFY_STORAGE_KEYS.PKCE_VERIFIER);
}

export function isSpotifyConnected(): boolean {
  return !!localStorage.getItem(SPOTIFY_STORAGE_KEYS.ACCESS_TOKEN);
}
