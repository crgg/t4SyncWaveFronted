/**
 * Spotify Web Playback SDK wrapper
 * Playback is local per user - no sync (per Spotify terms)
 *
 * Architecture:
 * - SDK: connect, pause, resume, seek, volume, state updates (player_state_changed)
 * - REST API: start playback of a track (PUT /me/player/play with uris), transfer device
 *   (SDK has no method to play a specific track by URI)
 */

import { getValidSpotifyToken } from './spotifyAuth';
import { SPOTIFY_CONFIG } from './constants';
import { STORAGE_KEYS } from '@/shared/constants';

const { API_BASE } = SPOTIFY_CONFIG;

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
export let spotifyDeviceId: string | null = null;

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

/** Returns true when the SDK player is connected and has a device ID ready for playback. */
export function isSpotifyPlayerReady(): boolean {
  return !!spotifyDeviceId && !!playerInstance;
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
  spotifyDeviceId = null;

  const retrieveVolumen = localStorage.getItem(STORAGE_KEYS.VOLUME);
  const volume = retrieveVolumen ? parseFloat(retrieveVolumen) : 100;

  playerInstance = new window.Spotify.Player({
    name: 'T4SyncWave',
    getOAuthToken: async (cb) => {
      const t = await getValidSpotifyToken();
      if (t) cb(t);
    },
    volume: volume / 100,
  });

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

  // Wait for 'ready' event so device_id is set before any play call
  const deviceReady = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      playerInstance?.removeListener('ready');
      resolve(false);
    }, 15000);

    const onReady = (ev: { device_id?: string }) => {
      const device_id = ev?.device_id;
      if (device_id) {
        clearTimeout(timeout);
        spotifyDeviceId = device_id;
        playerInstance?.removeListener('ready');
        resolve(true);
      }
    };

    playerInstance!.addListener('ready', onReady as (state?: SpotifyPlayerState) => void);
  });

  return deviceReady;
}

export async function transferPlaybackToDevice(deviceId: string): Promise<boolean> {
  const token = await getValidSpotifyToken();
  if (!token) return false;
  deviceId;
  // const res = await fetch(`${API_BASE}/me/player`, {
  //   method: 'PUT',
  //   headers: {
  //     Authorization: `Bearer ${token}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ device_ids: [deviceId], play: false }),
  // });
  // return res.ok || res.status === 204;
  return true;
}

/**
 * Pushes a Spotify track to one or more specific device IDs.
 * Use this for the host to manually transfer playback to listener devices.
 * Each device must be associated with the Spotify account whose token is stored locally.
 */
export async function transferPlaybackToDevices(
  deviceIds: string[],
  spotifyId: string,
  positionMs?: number
): Promise<void> {
  const token = await getValidSpotifyToken();
  if (!token || deviceIds.length === 0) return;
  const uri = `spotify:track:${spotifyId}`;
  const body: Record<string, unknown> = { uris: [uri] };
  if (positionMs !== undefined && positionMs > 0) {
    body.position_ms = positionMs;
  }
  await Promise.allSettled(
    deviceIds.map((deviceId) =>
      fetch(`${API_BASE}/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    )
  );
}

export async function getDeviceIdFromApi(token: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/me/player/devices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const devices = data.devices || [];
  const ourDevice = devices.find(
    (d: { id?: string; name?: string }) => d.name === 'T4SyncWave' || d.id === spotifyDeviceId
  );
  return ourDevice?.id || null;
}

/**
 * Returns all active T4SyncWave device IDs registered to the Spotify account.
 * When all room members use the same group Spotify account, this discovers
 * every listener's browser SDK device so the host can broadcast playback to all.
 */
export async function getAllT4SyncWaveDeviceIds(): Promise<string[]> {
  const token = await getValidSpotifyToken();
  if (!token) return [];
  const res = await fetch(`${API_BASE}/me/player/devices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  const devices: Array<{ id?: string; name?: string }> = data.devices || [];
  return devices
    .filter((d) => d.name === 'T4SyncWave')
    .map((d) => d.id)
    .filter((id): id is string => !!id);
}

async function reconnectPlayer(): Promise<boolean> {
  if (playerInstance) {
    playerInstance.disconnect();
    playerInstance = null;
  }
  spotifyDeviceId = null;

  const token = await getValidSpotifyToken();
  if (!token) return false;
  if (!window.Spotify) await loadSpotifySDK();
  if (!window.Spotify) return false;

  playerInstance = new window.Spotify!.Player({
    name: 'T4SyncWave',
    getOAuthToken: async (cb) => {
      const t = await getValidSpotifyToken();
      if (t) cb(t);
    },
    volume: 1,
  });

  playerInstance.addListener('not_ready', () => {
    spotifyDeviceId = null;
  });

  if (stateChangeCallback) {
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
  }

  const connected = await playerInstance.connect();
  if (!connected) return false;

  const deviceReady = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      playerInstance?.removeListener('ready');
      resolve(false);
    }, 10000);
    const onReady = (ev: { device_id?: string }) => {
      if (ev?.device_id) {
        clearTimeout(timeout);
        spotifyDeviceId = ev.device_id;
        playerInstance?.removeListener('ready');
        resolve(true);
      }
    };
    playerInstance!.addListener('ready', onReady as (state?: SpotifyPlayerState) => void);
  });
  return deviceReady;
}

/**
 * Plays a Spotify track on the host's SDK device and, optionally, broadcasts
 * to all other T4SyncWave devices registered to the same Spotify account
 * (i.e. every listener in the room who connected to the group's shared account).
 *
 * @param spotifyId  - Spotify track ID
 * @param positionMs - Start position in milliseconds (for synced start)
 * @param broadcastToListeners - When true, fetches all T4SyncWave devices and
 *   fires PUT /me/player/play on each listener device after the host device starts.
 */
export async function playSpotifyTrack(
  spotifyId: string,
  positionMs?: number,
  broadcastToListeners = false
): Promise<boolean> {
  const token = await getValidSpotifyToken();
  if (!token) return false;

  if (!spotifyDeviceId || !playerInstance) {
    throw new Error('Spotify player not ready. Please try again.');
  }

  const uri = `spotify:track:${spotifyId}`;

  // Required for mobile autoplay
  try {
    await playerInstance.activateElement();
  } catch {
    /* desktop may not need */
  }

  // Use device_id from API if available (more reliable than SDK's ready event)
  let deviceId = spotifyDeviceId;
  for (let i = 0; i < 10; i++) {
    const apiDeviceId = await getDeviceIdFromApi(token);
    if (apiDeviceId) {
      deviceId = apiDeviceId;
      spotifyDeviceId = apiDeviceId;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!deviceId) {
    throw new Error('Spotify device not ready. Refresh the page and try again.');
  }

  const playUrl = `${API_BASE}/me/player/play?device_id=${deviceId}`;

  // Transfer playback to our device first (required to avoid 404 NO_ACTIVE_DEVICE)
  await transferPlaybackToDevice(deviceId);
  await new Promise((r) => setTimeout(r, 400));

  const hostBody: Record<string, unknown> = { uris: [uri] };
  if (positionMs !== undefined && positionMs > 0) {
    hostBody.position_ms = positionMs;
  }

  let response = await fetch(playUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(hostBody),
  });

  // If 404 "Device not found", reconnect player and retry
  if (response.status === 404) {
    const errBody = await response
      .clone()
      .json()
      .catch(() => ({}));
    const isDeviceNotFound = errBody.error?.message?.toLowerCase().includes('device') ?? false;

    if (isDeviceNotFound) {
      const reconnected = await reconnectPlayer();
      if (reconnected && spotifyDeviceId) {
        await new Promise((r) => setTimeout(r, 800));
        const newDeviceId = (await getDeviceIdFromApi(token)) || spotifyDeviceId;
        await transferPlaybackToDevice(newDeviceId);
        await new Promise((r) => setTimeout(r, 400));
        response = await fetch(`${API_BASE}/me/player/play?device_id=${newDeviceId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(hostBody),
        });
      }
    } else {
      await transferPlaybackToDevice(deviceId);
      await new Promise((r) => setTimeout(r, 500));
      response = await fetch(playUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hostBody),
      });
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || '';
    const reason = err.error?.reason || '';
    if (response.status === 404) {
      const hint = msg.toLowerCase().includes('device not found')
        ? 'Spotify device disconnected. Refresh the page and try again.'
        : reason === 'NO_ACTIVE_DEVICE' || msg.includes('device')
          ? 'Open Spotify app once, then try again.'
          : 'Spotify Premium required. Try refreshing the page.';
      throw new Error(hint);
    }
    throw new Error(msg || 'Spotify playback failed');
  }

  // Broadcast to all other T4SyncWave devices (listeners in the room).
  // Only applies when the group shares a single Spotify account across members.
  if (broadcastToListeners) {
    const listenerBody: Record<string, unknown> = { uris: [uri] };
    if (positionMs !== undefined && positionMs > 0) {
      listenerBody.position_ms = positionMs;
    }
    try {
      const allDeviceIds = await getAllT4SyncWaveDeviceIds();
      const otherDeviceIds = allDeviceIds.filter((id) => id !== deviceId);
      await Promise.allSettled(
        otherDeviceIds.map((listenerId) =>
          fetch(`${API_BASE}/me/player/play?device_id=${listenerId}`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(listenerBody),
          })
        )
      );
    } catch {
      // Best-effort: broadcast failures don't break the host's playback
    }
  }

  return true;
}

export async function pauseSpotifyPlayer(): Promise<void> {
  if (!playerInstance) return;
  try {
    await playerInstance.pause();
  } catch {
    // Fallback to REST API if SDK fails
    const token = await getValidSpotifyToken();
    if (token) {
      await fetch(`${API_BASE}/me/player/pause`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }
}

export async function resumeSpotifyPlayer(): Promise<void> {
  if (!playerInstance) return;
  try {
    await playerInstance.resume();
  } catch {
    const token = await getValidSpotifyToken();
    if (token && spotifyDeviceId) {
      await fetch(`${API_BASE}/me/player/play?device_id=${spotifyDeviceId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }
}

export async function seekSpotifyPlayer(positionSeconds: number): Promise<void> {
  if (!playerInstance) return;
  const positionMs = Math.floor(positionSeconds * 1000);
  try {
    await playerInstance.seek(positionMs);
  } catch {
    const token = await getValidSpotifyToken();
    if (token) {
      await fetch(`${API_BASE}/me/player/seek?position_ms=${positionMs}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }
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
