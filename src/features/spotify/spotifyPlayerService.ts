/**
 * Spotify Web Playback SDK wrapper
 * Playback is local per user - no sync (per Spotify terms)
 */

import { getValidSpotifyToken } from './spotifyAuth';

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export interface SpotifyPlayerState {
  paused: boolean;
  position: number;
  duration: number;
  track_window?: {
    current_track: {
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      duration_ms: number;
    };
  };
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (state?: SpotifyPlayerState) => void) => void;
  removeListener: (event: string) => void;
  getCurrentState: () => Promise<SpotifyPlayerState | null>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  activateElement: () => Promise<void>;
}

type StateChangeCallback = (state: {
  isPlaying: boolean;
  currentPosition: number;
  trackDuration?: number;
  trackId?: string;
  trackTitle?: string;
  trackArtist?: string;
}) => void;

let playerInstance: SpotifyPlayer | null = null;
let stateChangeCallback: StateChangeCallback | null = null;
let spotifyDeviceId: string | null = null;

const SPOTIFY_SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

function loadSpotifySDK(): Promise<void> {
  return new Promise((resolve) => {
    if (window.Spotify) {
      resolve();
      return;
    }
    // Set callback BEFORE loading script - SDK calls it when ready
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const existing = document.querySelector(`script[src="${SPOTIFY_SDK_URL}"]`);
    if (existing) {
      if (window.Spotify) resolve();
      else {
        const check = setInterval(() => {
          if (window.Spotify) {
            clearInterval(check);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(check);
          resolve();
        }, 5000);
      }
      return;
    }
    const script = document.createElement('script');
    script.src = SPOTIFY_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Spotify) resolve();
    };
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

export async function initSpotifyPlayer(onStateChange: StateChangeCallback): Promise<boolean> {
  const token = await getValidSpotifyToken();
  if (!token) return false;

  stateChangeCallback = onStateChange;

  await loadSpotifySDK();
  if (!window.Spotify) {
    console.warn('Spotify Web Playback SDK not loaded');
    return false;
  }

  if (playerInstance) {
    playerInstance.disconnect();
    playerInstance = null;
  }

  playerInstance = new window.Spotify.Player({
    name: 'T4SyncWave',
    getOAuthToken: async (cb) => {
      const t = await getValidSpotifyToken();
      if (t) cb(t);
    },
    volume: 1,
  });

  // playerInstance.addListener('ready', ({ device_id }: { device_id: string }) => {
  playerInstance.addListener('ready', ({ device_id }: any) => {
    spotifyDeviceId = device_id;
    console.log('Spotify player ready, device:', device_id);
  });

  // playerInstance.addListener('not_ready', ({ device_id }: { device_id: string }) => {
  playerInstance.addListener('not_ready', ({ device_id }: any) => {
    spotifyDeviceId = null;
    console.warn('Spotify player not ready', device_id);
  });

  playerInstance.addListener('player_state_changed', (state) => {
    if (!state || !stateChangeCallback) return;
    const track = state.track_window?.current_track;
    stateChangeCallback({
      isPlaying: !state.paused,
      currentPosition: state.position / 1000,
      trackDuration: state.duration / 1000,
      trackId: track?.id,
      trackTitle: track?.name,
      trackArtist: track?.artists?.map((a) => a.name).join(', '),
    });
  });

  const connected = await playerInstance.connect();
  if (!connected) {
    console.warn('Spotify player failed to connect');
    return false;
  }

  return true;
}

export async function playSpotifyTrack(spotifyId: string): Promise<boolean> {
  const token = await getValidSpotifyToken();
  if (!token) return false;

  const uri = `spotify:track:${spotifyId}`;
  const url = spotifyDeviceId
    ? `https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`
    : 'https://api.spotify.com/v1/me/player/play';
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: [uri] }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 404) {
      console.warn('No Spotify device found. Open Spotify app or refresh the page.');
    } else {
      console.warn('Spotify play failed:', err);
    }
    return false;
  }
  return true;
}

export async function pauseSpotifyPlayer(): Promise<void> {
  const token = await getValidSpotifyToken();
  if (!token || !playerInstance) return;

  await fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function resumeSpotifyPlayer(): Promise<void> {
  const token = await getValidSpotifyToken();
  if (!token) return;

  await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function seekSpotifyPlayer(positionSeconds: number): Promise<void> {
  const token = await getValidSpotifyToken();
  if (!token) return;

  await fetch(
    `https://api.spotify.com/v1/me/player/seek?position_ms=${Math.floor(positionSeconds * 1000)}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function setSpotifyVolume(volume: number): Promise<void> {
  if (!playerInstance) return;
  await playerInstance.setVolume(volume / 100);
}

export function disconnectSpotifyPlayer(): void {
  if (playerInstance) {
    playerInstance.disconnect();
    playerInstance = null;
  }
  spotifyDeviceId = null;
  stateChangeCallback = null;
}
