/**
 * Spotify Web API client and backend group Spotify APIs
 */

import { http } from '@app/http';
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

export interface GroupSpotifyConnectResponse {
  status: boolean;
  authUrl: string;
  message: string;
}

export interface GroupSpotifyDisconnectResponse {
  status: boolean;
  message: string;
}

export interface GroupSpotifyStatusResponse {
  status: boolean;
  isOwner: boolean;
  spotifyConnected: boolean;
  canUseSpotify: boolean;
}

export interface GroupSpotifyTrack {
  id?: string;
  spotify_id: string;
  spotify_uri: string;
  spotify_url: string;
  title: string;
  artist: string;
  album: string;
  duration_ms: number;
  source: 'spotify';
}

export interface GroupSpotifySearchResponse {
  status: boolean;
  tracks: GroupSpotifyTrack[];
}

export interface GroupSpotifyQueueItem {
  id: string;
  group_id: string;
  track_id: string;
  position: number;
  added_by: string;
}

export interface GroupSpotifyAddTrackRequest {
  spotifyUri: string;
}

export interface GroupSpotifyAddTrackResponse {
  status: boolean;
  track: GroupSpotifyTrack;
  queueItem: GroupSpotifyQueueItem;
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  country: string | null;
  product: 'premium' | 'free' | 'open' | null;
  images: Array<{ url: string; height: number; width: number }>;
  external_urls: { spotify: string };
}

export async function spotifyFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
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

export async function getSpotifyCurrentUser(): Promise<SpotifyUserProfile | null> {
  if (!SPOTIFY_CONFIG.CLIENT_ID) return null;
  try {
    return await spotifyFetch<SpotifyUserProfile>('/me');
  } catch {
    return null;
  }
}

export async function getGroupSpotifyConnect(
  groupId: string,
  options?: { redirectUri?: string }
): Promise<GroupSpotifyConnectResponse> {
  const params = new URLSearchParams();
  if (options?.redirectUri) {
    params.set('redirect_uri', options.redirectUri);
  }
  const query = params.toString();
  const url = `/groups/${groupId}/spotify/connect${query ? `?${query}` : ''}`;
  const response = await http.get<GroupSpotifyConnectResponse>(url);
  return response.data;
}

export async function postGroupSpotifyDisconnect(
  groupId: string
): Promise<GroupSpotifyDisconnectResponse> {
  const response = await http.post<GroupSpotifyDisconnectResponse>(
    `/groups/${groupId}/spotify/disconnect`
  );
  return response.data;
}

export async function getGroupSpotifyStatus(groupId: string): Promise<GroupSpotifyStatusResponse> {
  const response = await http.get<GroupSpotifyStatusResponse>(`/groups/${groupId}/spotify/status`);
  return response.data;
}

export async function getGroupSpotifySearch(
  groupId: string,
  params: { q: string; limit?: number }
): Promise<GroupSpotifySearchResponse> {
  const searchParams = new URLSearchParams({ q: params.q });
  if (params.limit != null) {
    searchParams.set('limit', String(Math.min(50, Math.max(1, params.limit))));
  }
  const response = await http.get<GroupSpotifySearchResponse>(
    `/groups/${groupId}/spotify/search?${searchParams}`
  );
  return response.data;
}

export async function postGroupSpotifyAddTrack(
  groupId: string,
  body: GroupSpotifyAddTrackRequest
): Promise<GroupSpotifyAddTrackResponse> {
  const response = await http.post<GroupSpotifyAddTrackResponse>(
    `/groups/${groupId}/spotify/add-track`,
    body
  );
  return response.data;
}
