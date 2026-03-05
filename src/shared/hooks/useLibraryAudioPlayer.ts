import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { msToSeconds } from '@shared/utils';
import { STORAGE_KEYS } from '@shared/constants';
import { AUDIO_SECONDS } from '@/features/audio/utils/constants';
import { useLocalAudioPlayer } from './useLocalAudioPlayer';
import {
  initSpotifyPlayer,
  playSpotifyTrack,
  pauseSpotifyPlayer,
  resumeSpotifyPlayer,
  seekSpotifyPlayer,
  setSpotifyVolume,
  disconnectSpotifyPlayer,
} from '@/features/spotify/spotifyPlayerService';
import { isValidAudioUrl } from '@shared/utils';

export interface LibraryTrack {
  id: string;
  file_url: string;
  title?: string;
  artist?: string;
  duration_ms?: number;
  source?: string;
  spotify_id?: string;
}

interface LibraryAudioState {
  isPlaying: boolean;
  currentPosition: number;
  trackDuration: number;
  volume: number;
  trackId: string | null;
  trackUrl: string | null;
  trackTitle?: string;
  trackArtist?: string;
  isLoading: boolean;
  error: string | null;
}

interface UseLibraryAudioPlayerReturn {
  audioState: LibraryAudioState;
  play: () => void;
  pause: () => void;
  seek: (position: number) => void;
  setVolume: (volume: number) => void;
  setTrack: (
    track: {
      id: string;
      url: string;
      title?: string;
      artist?: string;
      duration_ms?: number;
      source?: string;
      spotifyId?: string;
    },
    isPlaying?: boolean
  ) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
}

interface SetTrackPayload {
  id: string;
  url: string;
  title?: string;
  artist?: string;
  duration_ms?: number;
  source?: string;
  spotifyId?: string;
}

function isSpotifyTrack(track: { source?: string; spotifyId?: string }): boolean {
  return track.source === 'spotify' || !!track.spotifyId;
}

export function useLibraryAudioPlayer(tracks: LibraryTrack[]): UseLibraryAudioPlayerReturn {
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isSpotifyActive, setIsSpotifyActive] = useState(false);
  const [spotifyState, setSpotifyState] = useState<{
    isPlaying: boolean;
    currentPosition: number;
    trackDuration: number;
    trackTitle?: string;
    trackArtist?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentLibraryTrackIdRef = useRef<string | null>(null);

  const localTracks = useMemo(
    () =>
      tracks.filter(
        (t) => t.source !== 'spotify' && t.file_url && isValidAudioUrl(t.file_url)
      ) as Array<{
        id: string;
        file_url: string;
        title?: string;
        artist?: string;
        duration_ms?: number;
      }>,
    [tracks]
  );

  const localPlayer = useLocalAudioPlayer(localTracks);

  const setTrack = useCallback(
    async (track: SetTrackPayload, isPlaying: boolean = false) => {
      const index = tracks.findIndex((t) => t.id === track.id);
      setCurrentTrackIndex(index !== -1 ? index : null);
      setError(null);

      if (isSpotifyTrack(track) && track.spotifyId) {
        setIsSpotifyActive(true);
        currentLibraryTrackIdRef.current = track.id;
        localPlayer.pause();

        setIsLoading(true);
        setSpotifyState({
          isPlaying: false,
          currentPosition: 0,
          trackDuration: track.duration_ms ? msToSeconds(track.duration_ms) : 0,
          trackTitle: track.title,
          trackArtist: track.artist,
        });

        try {
          const ok = await initSpotifyPlayer((state) => {
            setSpotifyState({
              isPlaying: state.isPlaying,
              currentPosition: state.currentPosition,
              trackDuration: state.trackDuration ?? 0,
              trackTitle: state.trackTitle ?? track.title,
              trackArtist: state.trackArtist ?? track.artist,
            });
          });

          if (ok && isPlaying) {
            await playSpotifyTrack(track.spotifyId!);
            setSpotifyState((prev) => (prev ? { ...prev, isPlaying: true } : null));
          } else if (!ok) {
            setError('Spotify Premium required. Connect your Spotify account to play.');
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Spotify playback failed';
          setError(msg);
          setIsSpotifyActive(false);
          setSpotifyState(null);
          currentLibraryTrackIdRef.current = null;
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsSpotifyActive(false);
        setSpotifyState(null);
        currentLibraryTrackIdRef.current = null;
        disconnectSpotifyPlayer();

        if (track.url && isValidAudioUrl(track.url)) {
          localPlayer.setTrack(
            {
              id: track.id,
              url: track.url,
              title: track.title,
              artist: track.artist,
              duration_ms: track.duration_ms,
            },
            isPlaying
          );
        } else {
          setError('Invalid audio URL');
        }
      }
    },
    [tracks, localPlayer]
  );

  const play = useCallback(() => {
    if (isSpotifyActive) {
      resumeSpotifyPlayer().then(() => {
        setSpotifyState((prev) => (prev ? { ...prev, isPlaying: true } : null));
      });
    } else {
      localPlayer.play();
    }
  }, [isSpotifyActive, localPlayer]);

  const pause = useCallback(() => {
    if (isSpotifyActive) {
      pauseSpotifyPlayer();
      setSpotifyState((prev) => (prev ? { ...prev, isPlaying: false } : null));
    } else {
      localPlayer.pause();
    }
  }, [isSpotifyActive, localPlayer]);

  const seek = useCallback(
    (position: number) => {
      if (isSpotifyActive) {
        seekSpotifyPlayer(position);
        setSpotifyState((prev) => (prev ? { ...prev, currentPosition: position } : null));
      } else {
        localPlayer.seek(position);
      }
    },
    [isSpotifyActive, localPlayer]
  );

  const setVolume = useCallback(
    (vol: number) => {
      const clampedVolume = Math.max(0, Math.min(100, vol));
      localStorage.setItem(STORAGE_KEYS.VOLUME, clampedVolume.toString());

      if (isSpotifyActive) {
        setSpotifyVolume(clampedVolume);
      }
      localPlayer.setVolume(clampedVolume);
    },
    [isSpotifyActive, localPlayer]
  );

  const nextTrack = useCallback(() => {
    if (currentTrackIndex === null || currentTrackIndex >= tracks.length - 1) return;

    const nextTrackData = tracks[currentTrackIndex + 1];
    if (!nextTrackData) return;

    setTrack(
      {
        id: nextTrackData.id,
        url: nextTrackData.file_url,
        title: nextTrackData.title,
        artist: nextTrackData.artist,
        duration_ms: nextTrackData.duration_ms,
        source: nextTrackData.source,
        spotifyId: nextTrackData.spotify_id,
      },
      true
    );
  }, [currentTrackIndex, tracks, setTrack]);

  const previousTrack = useCallback(() => {
    if (currentTrackIndex === null || currentTrackIndex <= 0) return;

    const prevTrackData = tracks[currentTrackIndex - 1];
    if (!prevTrackData) return;

    setTrack(
      {
        id: prevTrackData.id,
        url: prevTrackData.file_url,
        title: prevTrackData.title,
        artist: prevTrackData.artist,
        duration_ms: prevTrackData.duration_ms,
        source: prevTrackData.source,
        spotifyId: prevTrackData.spotify_id,
      },
      true
    );
  }, [currentTrackIndex, tracks, setTrack]);

  const skipForward = useCallback(
    (seconds: number = AUDIO_SECONDS.SKIP_FORWARD) => {
      if (isSpotifyActive && spotifyState) {
        const newPosition = Math.min(
          spotifyState.currentPosition + seconds,
          spotifyState.trackDuration
        );
        seek(newPosition);
      } else {
        localPlayer.skipForward(seconds);
      }
    },
    [isSpotifyActive, spotifyState, seek, localPlayer]
  );

  const skipBackward = useCallback(
    (seconds: number = AUDIO_SECONDS.SKIP_BACKWARD) => {
      if (isSpotifyActive && spotifyState) {
        const newPosition = Math.max(spotifyState.currentPosition - seconds, 0);
        seek(newPosition);
      } else {
        localPlayer.skipBackward(seconds);
      }
    },
    [isSpotifyActive, spotifyState, seek, localPlayer]
  );

  const audioState: LibraryAudioState =
    isSpotifyActive && spotifyState
      ? {
          isPlaying: spotifyState.isPlaying,
          currentPosition: spotifyState.currentPosition,
          trackDuration: spotifyState.trackDuration,
          volume: localPlayer.audioState.volume,
          trackId: currentLibraryTrackIdRef.current,
          trackUrl: null,
          trackTitle: spotifyState.trackTitle,
          trackArtist: spotifyState.trackArtist,
          isLoading,
          error,
        }
      : {
          ...localPlayer.audioState,
          trackId: localPlayer.audioState.trackId,
          isLoading: false,
          error,
        };

  useEffect(() => {
    return () => {
      if (isSpotifyActive) {
        disconnectSpotifyPlayer();
      }
    };
  }, []);

  return {
    audioState,
    play,
    pause,
    seek,
    setVolume,
    setTrack,
    nextTrack,
    previousTrack,
    skipForward,
    skipBackward,
  };
}
