/**
 * Spotify Web API client
 */

import { SPOTIFY_CONFIG } from './constants';
import { getValidSpotifyToken } from './spotifyAuth';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: { images: Array<{ url: string; height: number; width: number }>; name: string };
  duration_ms: number;
  uri: string;
  external_urls: { spotify: string };
}

export interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
    total: number;
    limit: number;
    offset: number;
  };
}

async function spotifyFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await getValidSpotifyToken();
  if (!token) {
    throw new Error('Spotify not connected. Please log in to Spotify.');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${SPOTIFY_CONFIG.API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    throw new Error('Spotify session expired. Please log in again.');
  }

  if (response.status === 403) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || '';
    if (msg.toLowerCase().includes('premium') || msg.toLowerCase().includes('quota')) {
      throw new Error(
        '403 Forbidden: Development Mode apps require the app owner to have Spotify Premium. ' +
          'Add your account in Spotify Developer Dashboard > User Management.'
      );
    }
    throw new Error(
      '403 Forbidden: ' +
        (msg ||
          'Access denied. Ensure the app owner has Spotify Premium and your account is in User Management.')
    );
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Spotify API error: ${response.status}`);
  }

  return response.json();
}

export async function searchSpotifyTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
  if (!query.trim()) return [];
  // Development Mode: search limit max is 10 (Feb 2026 migration)
  const safeLimit = Math.min(Math.max(1, limit), 10);
  const params = new URLSearchParams({
    q: query.trim(),
    type: 'track',
    limit: String(safeLimit),
  });
  const data = await spotifyFetch<SpotifySearchResponse>(`/search?${params}`);
  return data.tracks?.items ?? [];
}

export async function getSpotifyTrack(trackId: string): Promise<SpotifyTrack | null> {
  try {
    return await spotifyFetch<SpotifyTrack>(`/tracks/${trackId}`);
  } catch {
    return null;
  }
}
