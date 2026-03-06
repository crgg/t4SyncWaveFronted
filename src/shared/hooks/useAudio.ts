import { useEffect, useCallback, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import {
  play,
  pause,
  seek,
  setVolume as setVolumeAction,
  toggleMute as toggleMuteAction,
  setTrack,
  setAudioState,
  setError,
  setLoading,
} from '@features/audio/audioSlice';
import { setCurrentTrackIndex, updateTrackDuration } from '@features/playlist/playlistSlice';
import { getAudioService } from '@services/audio/audioService';
import { getWebSocketService } from '@services/websocket/websocketService';
import {
  initSpotifyPlayer,
  playSpotifyTrack,
  pauseSpotifyPlayer,
  resumeSpotifyPlayer,
  seekSpotifyPlayer,
  setSpotifyVolume,
  spotifyDeviceId,
  transferPlaybackToDevice,
} from '@features/spotify/spotifyPlayerService';
import { WS_URL, SOCKET_EVENTS, STORAGE_KEYS } from '@shared/constants';
import type { AudioState } from '@shared/types';
import { isValidAudioUrl, isSpotifyTrack } from '@shared/utils';
import { store } from '@app/store';

/**
 * Emits a single PLAYBACK_STATE message to synchronize Spotify state with listeners.
 * Using one message avoids the race condition that occurred when emitting AUDIO_PLAY/PAUSE/SEEK
 * (without isPlaying) followed by PLAYBACK_STATE (with isPlaying), which caused a brief
 * incorrect pause on listener devices.
 */
function emitSpotifyState(
  spotifyId: string,
  position: number,
  isPlaying: boolean,
  timestamp: number
): void {
  try {
    const wsService = getWebSocketService({ url: WS_URL });
    if (!wsService.isConnected()) return;
    wsService.emit(SOCKET_EVENTS.PLAYBACK_STATE, {
      room: wsService.getSocketId() || '',
      userName: 'User',
      position,
      isPlaying,
      // Server-side field names
      appleMusicId: spotifyId,
      source: 'spotify',
      // Client-side field names (backward compat)
      spotifyId,
      trackSource: 'spotify',
      timestamp,
    });
  } catch (err) {
    console.error('Error emitting Spotify state:', err);
  }
}

export function useAudio() {
  const dispatch = useAppDispatch();
  const audioState = useAppSelector((state) => state.audio);
  const { role } = useAppSelector((state) => state.session);
  const { tracks, currentTrackIndex } = useAppSelector((state) => state.playlist);
  const audioServiceRef = useRef<ReturnType<typeof getAudioService> | null>(null);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  // Tracks whether playSpotifyTrack has been called for the current Spotify track.
  // False on mount and reset every time a new Spotify track is loaded.
  // On the first Play click, playSpotifyTrack (loads + plays) is called.
  // On subsequent Play clicks (after pause), resumeSpotifyPlayer is used instead.
  const spotifyTrackLoadedRef = useRef(false);
  const lastSyncRef = useRef({
    position: 0,
    timestamp: 0,
    isPlaying: false,
    trackUrl: '',
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (audioServiceRef.current && audioState.volume !== undefined) {
        try {
          const volumeToSet = audioState.isMuted ? 0 : audioState.volume;
          audioServiceRef.current.setVolume(volumeToSet);
        } catch (error) {
          console.error('Error al establecer volumen inicial:', error);
        }
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (audioServiceRef.current && audioState.volume !== undefined) {
      try {
        const volumeToSet = audioState.isMuted ? 0 : audioState.volume;
        audioServiceRef.current.setVolume(volumeToSet);
      } catch (error) {
        console.error('Error al sincronizar volumen:', error);
      }
    }
  }, [audioState.volume, audioState.isMuted]);

  useEffect(() => {
    const isSpotify = isSpotifyTrack(audioState);

    // Spotify track without ID: stop immediately — the open.spotify.com URL must
    // never reach HTMLAudioElement. Handles stale state or bad data from server.
    if (isSpotify && !audioState.spotifyId) {
      if (audioServiceRef.current) {
        audioServiceRef.current.cleanup();
        audioServiceRef.current = null;
      }
      return () => {};
    }

    // Spotify: use Web Playback SDK (no sync)
    if (isSpotify && audioState.spotifyId) {
      if (audioServiceRef.current) {
        audioServiceRef.current.cleanup();
        audioServiceRef.current = null;
      }
      // New Spotify track — reset the "has been started" flag so the first Play
      // click calls playSpotifyTrack (load+play) instead of resumeSpotifyPlayer.
      spotifyTrackLoadedRef.current = false;

      dispatch(setLoading({ isLoading: true }));
      dispatch(setError({ error: '' }));
      initSpotifyPlayer((state) => {
        dispatch(
          setAudioState({
            ...store.getState().audio,
            isPlaying: state.isPlaying,
            currentPosition: state.currentPosition,
            trackDuration: state.trackDuration,
            trackTitle: state.trackTitle ?? audioState.trackTitle,
            trackArtist: state.trackArtist ?? audioState.trackArtist,
          })
        );
      })
        .then(async (ok) => {
          if (ok && role === 'dj') {
            // Host: just register the SDK device as active on Spotify without starting
            // playback. The host clicks Play manually when ready.
            if (spotifyDeviceId) {
              try {
                await transferPlaybackToDevice(spotifyDeviceId);
              } catch {
                // Non-critical: device registration failure doesn't block manual play
              }
            }
          } else if (ok && role === 'member') {
            const deviceId = spotifyDeviceId;
            if (deviceId) {
              const currentSpotifyId = store.getState().audio.spotifyId;
              if (currentSpotifyId) {
                try {
                  await playSpotifyTrack(currentSpotifyId, 0, false);
                  // Small delay to let Spotify register the play before we pause.
                  await new Promise((r) => setTimeout(r, 400));
                  await pauseSpotifyPlayer();
                } catch {
                  // Non-critical: playback load may fail if Premium is missing or
                  // device is slow; device ID is still usable for manual transfer.
                }
              }
              try {
                const wsService = getWebSocketService({ url: WS_URL });
                wsService.emit(SOCKET_EVENTS.SPOTIFY_LISTENER_DEVICE, { deviceId });
              } catch (error) {
                console.error('Error emitting Spotify listener device:', error);
              }
            }
          }
        })
        .then(() => dispatch(setLoading({ isLoading: false })))
        .catch((err) => {
          dispatch(setError({ error: err?.message || 'Spotify playback failed' }));
          dispatch(setLoading({ isLoading: false }));
        });
      return () => {};
    }

    // File track: require valid URL
    if (!audioState.trackUrl || audioState.trackUrl.trim() === '') {
      if (audioServiceRef.current) {
        audioServiceRef.current.cleanup();
        audioServiceRef.current = null;
      }
      return;
    }

    if (!isValidAudioUrl(audioState.trackUrl)) {
      console.warn(
        'Intento de usar una URL inválida como URL de audio:',
        audioState.trackUrl,
        'Debe ser un archivo de audio válido (ej: .mp3, .wav, etc.)'
      );
      dispatch(
        setError({
          error:
            'URL de audio no válida. Debe ser un archivo de audio válido (ej: .mp3, .wav, .ogg, etc.)',
        })
      );
      return;
    }

    const audioService = getAudioService();
    audioService.setHandleInteraction(() => setNeedsInteraction(true));
    const audioServiceState = audioService.getState();
    const currentServiceUrl = audioServiceState?.trackUrl || '';

    if (audioServiceRef.current) {
      const currentUrl = audioServiceRef.current.getState()?.trackUrl;
      if (currentUrl === audioState.trackUrl || currentServiceUrl === audioState.trackUrl) {
        // Asegurar que si está muted o volumen es 0, el audio no suene
        const currentVolume = audioState.isMuted ? 0 : (audioState.volume ?? 100);
        try {
          audioServiceRef.current.setVolume(currentVolume);
        } catch (error) {
          console.error('Error al establecer volumen:', error);
        }
        return;
      }
      if (currentUrl !== audioState.trackUrl) {
        audioServiceRef.current.cleanup();
        audioServiceRef.current = null;
      }
    }

    if (currentServiceUrl === audioState.trackUrl && audioServiceState) {
      audioServiceRef.current = audioService;
      if (role === 'member') {
        (audioServiceState as any).isPlaying = audioState.isPlaying || false;
        (audioServiceState as any).currentPosition = audioState.currentPosition || 0;
        if (audioState.trackDuration) {
          (audioServiceState as any).trackDuration = audioState.trackDuration;
        }
      }
      // Asegurar que si está muted o volumen es 0, el audio no suene
      const currentVolume = audioState.isMuted ? 0 : (audioState.volume ?? 100);
      try {
        audioService.setVolume(currentVolume);
      } catch (error) {
        console.error('Error al establecer volumen:', error);
      }
      return;
    }

    audioServiceRef.current = audioService;

    if (role === 'member') {
      const audioServiceState = audioService.getState();
      if (!audioServiceState) {
        (audioService as any).currentState = {
          isPlaying: audioState.isPlaying || false,
          currentPosition: audioState.currentPosition || 0,
          volume: audioState.isMuted ? 0 : audioState.volume || 100,
          trackId: audioState.trackId || '',
          trackUrl: audioState.trackUrl,
          trackTitle: audioState.trackTitle,
          trackArtist: audioState.trackArtist,
          trackDuration: audioState.trackDuration,
          timestamp: audioState.timestamp || Date.now(),
        };
      } else {
        (audioServiceState as any).isPlaying = audioState.isPlaying || false;
        (audioServiceState as any).currentPosition = audioState.currentPosition || 0;
        (audioServiceState as any).trackUrl = audioState.trackUrl;
        if (audioState.trackDuration) {
          (audioServiceState as any).trackDuration = audioState.trackDuration;
        }
      }
    }

    dispatch(setLoading({ isLoading: true }));
    dispatch(setError({ error: '' }));

    audioService.init(audioState.trackUrl, (state: AudioState & { error?: string }) => {
      if ((state as any).error) {
        dispatch(setError({ error: (state as any).error }));
        dispatch(setLoading({ isLoading: false }));
        return;
      }

      if (!state || isNaN(state.currentPosition)) {
        return;
      }

      const currentReduxState = store.getState().audio;

      if (role === 'member') {
        const positionDiff = Math.abs(
          (state.currentPosition || 0) - (currentReduxState.currentPosition || 0)
        );
        const hasPositionChange = positionDiff > 0.05;
        const hasDurationChange =
          state.trackDuration && state.trackDuration !== currentReduxState.trackDuration;

        if (hasPositionChange || hasDurationChange) {
          dispatch(
            setAudioState({
              ...currentReduxState,
              currentPosition: state.currentPosition,
              trackDuration: state.trackDuration || currentReduxState.trackDuration,
            })
          );
        }
        return;
      }

      const positionDiff = Math.abs(
        (state.currentPosition || 0) - (currentReduxState.currentPosition || 0)
      );
      const hasPositionChange = positionDiff > 0.05;
      const hasDurationChange =
        state.trackDuration !== currentReduxState.trackDuration && state.trackDuration;

      if (
        hasPositionChange ||
        hasDurationChange ||
        (!currentReduxState.trackDuration && state.trackDuration)
      ) {
        let validTrackUrl = currentReduxState.trackUrl || state.trackUrl;
        if (
          validTrackUrl &&
          (validTrackUrl.startsWith('/host/') || validTrackUrl.startsWith('/listener/'))
        ) {
          console.warn('Intento de usar ruta de app como trackUrl, preservando URL anterior');
          validTrackUrl = state.trackUrl || currentReduxState.trackUrl || '';
        }

        dispatch(setLoading({ isLoading: false }));

        const stateToDispatch: Partial<AudioState> = {
          currentPosition: state.currentPosition,
          trackDuration: state.trackDuration,
          trackId: currentReduxState.trackId || state.trackId,
          trackUrl: validTrackUrl,
          trackTitle: currentReduxState.trackTitle || state.trackTitle,
          trackArtist: currentReduxState.trackArtist || state.trackArtist,
        };

        dispatch(setAudioState(stateToDispatch as AudioState));
      }

      if (state.trackDuration && currentReduxState.trackId && hasDurationChange) {
        dispatch(
          updateTrackDuration({ trackId: currentReduxState.trackId, duration: state.trackDuration })
        );
      }
    });

    setTimeout(() => {
      if (audioServiceRef.current) {
        try {
          // Asegurar que si está muted o volumen es 0, el audio no suene
          // Usar el volumen del estado actual de Redux, no el currentVolume calculado
          const volumeToSet = audioState.isMuted ? 0 : (audioState.volume ?? 100);
          audioServiceRef.current.setVolume(volumeToSet);
        } catch (error) {
          console.error('Error al establecer volumen inicial:', error);
        }
      }
    }, 100);

    return () => {};
  }, [
    audioState.trackUrl,
    audioState.spotifyId,
    audioState.trackSource,
    role,
    dispatch,
    audioState.trackId,
    // No incluir trackTitle/trackArtist: el callback player_state_changed los actualiza
    // y provocaría re-ejecuciones que reinician el player y playSpotifyTrack repetidamente
  ]);

  useEffect(() => {
    if (role !== 'member' || !audioState.trackUrl) return;

    if (!audioServiceRef.current) {
      return;
    }

    const performSync = () => {
      if (!audioServiceRef.current) return;

      const currentState = store.getState().audio;
      if (!currentState.trackUrl) return;

      const timestampDiff = Math.abs(
        (lastSyncRef.current.timestamp || 0) - (currentState.timestamp || 0)
      );
      const isPlayingChanged = lastSyncRef.current.isPlaying !== currentState.isPlaying;
      const trackUrlChanged = lastSyncRef.current.trackUrl !== currentState.trackUrl;
      const hasNewServerEvent = timestampDiff > 100 || trackUrlChanged;

      const hasSignificantChange = hasNewServerEvent || isPlayingChanged;

      if (!hasSignificantChange && lastSyncRef.current.trackUrl === currentState.trackUrl) {
        return;
      }

      let serverPosition: number;
      let serverTimestamp: number;

      if (hasNewServerEvent) {
        serverPosition = currentState.currentPosition || 0;
        serverTimestamp = currentState.timestamp || Date.now();

        lastSyncRef.current = {
          position: serverPosition,
          timestamp: serverTimestamp,
          isPlaying: currentState.isPlaying || false,
          trackUrl: currentState.trackUrl,
        };
      } else if (isPlayingChanged) {
        const audioServiceState = audioServiceRef.current?.getState();
        serverPosition = audioServiceState?.currentPosition ?? lastSyncRef.current.position;
        serverTimestamp = lastSyncRef.current.timestamp;

        lastSyncRef.current = {
          ...lastSyncRef.current,
          isPlaying: currentState.isPlaying || false,
        };
      } else {
        return;
      }

      if (isNaN(serverPosition) || serverPosition < 0) {
        return;
      }

      try {
        const audioServiceState = audioServiceRef.current.getState();
        if (audioServiceState && audioServiceState.isPlaying !== currentState.isPlaying) {
          (audioServiceState as any).isPlaying = currentState.isPlaying;
        }

        // Usar la posición y timestamp del servidor
        audioServiceRef.current.sync(
          serverPosition,
          serverTimestamp,
          currentState.isPlaying || false,
          currentState.trackUrl
        );
      } catch (error) {
        console.error('Error en sincronización:', error);
      }
    };

    performSync();

    const syncInterval = setInterval(performSync, 100);

    return () => clearInterval(syncInterval);
  }, [role, audioState.trackUrl, audioState.timestamp, audioState.isPlaying, dispatch]);

  useEffect(() => {
    if (role !== 'member' || !audioState.isPlaying || !audioState.trackUrl) return;

    const currentState = store.getState().audio;
    const timestampDiff = Math.abs(
      (lastSyncRef.current.timestamp || 0) - (currentState.timestamp || 0)
    );

    if (
      timestampDiff > 100 ||
      lastSyncRef.current.trackUrl !== currentState.trackUrl ||
      lastSyncRef.current.isPlaying !== currentState.isPlaying
    ) {
      lastSyncRef.current = {
        position: currentState.currentPosition || 0,
        timestamp: currentState.timestamp || Date.now(),
        isPlaying: currentState.isPlaying || false,
        trackUrl: currentState.trackUrl,
      };
    }

    const progressInterval = setInterval(() => {
      const currentState = store.getState().audio;

      if (!currentState.isPlaying || !currentState.trackUrl) {
        return;
      }

      const currentTimestamp = currentState.timestamp || Date.now();
      const timestampDiff = Math.abs((lastSyncRef.current.timestamp || 0) - currentTimestamp);

      if (timestampDiff > 100 || lastSyncRef.current.trackUrl !== currentState.trackUrl) {
        lastSyncRef.current = {
          position: currentState.currentPosition || 0,
          timestamp: currentTimestamp,
          isPlaying: currentState.isPlaying || false,
          trackUrl: currentState.trackUrl,
        };
        return;
      }

      if (!lastSyncRef.current.isPlaying) {
        return;
      }

      const serverTimestamp = lastSyncRef.current.timestamp || currentTimestamp;
      const serverPosition = lastSyncRef.current.position;
      const timeSinceUpdate = (Date.now() - serverTimestamp) / 1000;
      const calculatedPosition = serverPosition + timeSinceUpdate;

      const maxPosition = currentState.trackDuration
        ? Math.min(calculatedPosition, currentState.trackDuration)
        : calculatedPosition;

      const positionDiff = Math.abs(maxPosition - (currentState.currentPosition || 0));
      if (
        positionDiff > 0.1 &&
        maxPosition >= 0 &&
        maxPosition >= (currentState.currentPosition || 0)
      ) {
        dispatch(
          setAudioState({
            ...currentState,
            currentPosition: Math.max(0, maxPosition),
          })
        );
      }
    }, 100);

    return () => clearInterval(progressInterval);
  }, [role, audioState.isPlaying, audioState.trackUrl, audioState.timestamp, dispatch]);

  useEffect(() => {
    if (role !== 'dj' || tracks.length === 0) return;

    const checkEnded = () => {
      if (
        audioState.isPlaying &&
        audioState.trackDuration &&
        audioState.currentPosition >= audioState.trackDuration - 0.5
      ) {
        const nextIndex = currentTrackIndex !== null ? (currentTrackIndex + 1) % tracks.length : 0;
        const nextTrack = tracks[nextIndex];

        if (nextTrack) {
          dispatch(setCurrentTrackIndex({ index: nextIndex }));
          dispatch(
            setTrack({
              trackId: nextTrack.id,
              trackUrl: nextTrack.url,
              trackTitle: nextTrack.title,
              trackArtist: nextTrack.artist,
              trackSource: nextTrack.source,
              spotifyId: nextTrack.spotifyId,
            })
          );

          const timestamp = Date.now();
          const wsService = getWebSocketService({ url: WS_URL });
          if (isSpotifyTrack(nextTrack)) {
            wsService.emit('audio:track-change', {
              trackId: nextTrack.id,
              appleMusicId: nextTrack.spotifyId,
              source: 'spotify',
              spotifyId: nextTrack.spotifyId,
              trackSource: 'spotify',
              trackTitle: nextTrack.title,
              trackArtist: nextTrack.artist,
              timestamp,
            });
          } else {
            wsService.emit('audio:track-change', {
              trackId: nextTrack.id,
              trackUrl: nextTrack.url,
              trackTitle: nextTrack.title,
              trackArtist: nextTrack.artist,
              timestamp,
            });
          }
        }
      }
    };

    const interval = setInterval(checkEnded, 500);
    return () => clearInterval(interval);
  }, [
    role,
    audioState.isPlaying,
    audioState.currentPosition,
    audioState.trackDuration,
    tracks,
    currentTrackIndex,
    dispatch,
  ]);

  const handlePlay = useCallback(() => {
    if (role !== 'dj') return;

    const isSpotify = isSpotifyTrack(audioState);
    if (isSpotify && audioState.spotifyId) {
      const timestamp = Date.now();
      dispatch(play({ timestamp }));

      const spotifyId = audioState.spotifyId;

      const emitSpotifyPlay = () => {
        const pos = store.getState().audio.currentPosition ?? 0;
        emitSpotifyState(spotifyId, pos, true, timestamp);
      };

      if (!spotifyTrackLoadedRef.current) {
        // First play: load the track onto the device and start playback.
        playSpotifyTrack(spotifyId, undefined, false)
          .then(() => {
            spotifyTrackLoadedRef.current = true;
            emitSpotifyPlay();
          })
          .catch((err) => {
            console.error('Spotify play failed:', err);
            dispatch(pause({ timestamp: Date.now() }));
          });
      } else {
        // Subsequent play after pause: just resume.
        resumeSpotifyPlayer()
          .then(() => {
            emitSpotifyPlay();
          })
          .catch((err) => {
            console.error('Spotify resume failed:', err);
            dispatch(pause({ timestamp: Date.now() }));
          });
      }
      return;
    }

    if (!audioState.trackUrl) {
      console.warn('There is no track loaded to play');
      return;
    }

    if (!audioServiceRef.current) {
      console.warn('AudioService is not initialized');
      return;
    }

    const timestamp = Date.now();
    dispatch(play({ timestamp }));

    audioServiceRef.current
      .play()
      .then(() => {
        try {
          const wsService = getWebSocketService({ url: WS_URL });
          if (wsService.isConnected()) {
            const currentState = audioServiceRef.current?.getState();
            const position = currentState?.currentPosition ?? 0;
            wsService.playAudio(timestamp, position, audioState.trackUrl);
          }
        } catch (error) {
          console.error('Error sending play to server:', error);
        }
      })
      .catch((error) => {
        console.error('Error playing audio:', error);
        dispatch(pause({ timestamp: Date.now() }));
      });
  }, [role, dispatch, audioState.trackUrl, audioState.spotifyId, audioState.trackSource]);

  const handlePause = useCallback(() => {
    if (role !== 'dj') return;
    if (isSpotifyTrack(audioState) && audioState.spotifyId) {
      const timestamp = Date.now();
      const pos = audioState.currentPosition ?? 0;
      dispatch(pause({ timestamp }));
      pauseSpotifyPlayer();
      emitSpotifyState(audioState.spotifyId, pos, false, timestamp);
      return;
    }
    if (audioServiceRef.current) {
      audioServiceRef.current.pause();
    }

    const timestamp = Date.now();
    dispatch(pause({ timestamp }));

    const wsService = getWebSocketService({ url: WS_URL });
    const currentState = audioServiceRef.current?.getState();
    const position = currentState?.currentPosition ?? audioState.currentPosition ?? 0;
    wsService.pauseAudio(timestamp, position, audioState.trackUrl);
  }, [
    role,
    dispatch,
    audioState.trackUrl,
    audioState.currentPosition,
    audioState.spotifyId,
    audioState.trackSource,
  ]);

  const handleSeek = useCallback(
    (position: number) => {
      if (role !== 'dj') return;

      const timestamp = Date.now();
      dispatch(seek({ position, timestamp }));

      if (isSpotifyTrack(audioState) && audioState.spotifyId) {
        seekSpotifyPlayer(position);
        emitSpotifyState(audioState.spotifyId, position, audioState.isPlaying, timestamp);
        return;
      }

      if (audioServiceRef.current) {
        audioServiceRef.current.seek(position);
      }

      const wsService = getWebSocketService({ url: WS_URL });
      wsService.seekAudio(position, timestamp, audioState.trackUrl, audioState.isPlaying);
    },
    [
      role,
      dispatch,
      audioState.trackUrl,
      audioState.isPlaying,
      audioState.spotifyId,
      audioState.trackSource,
    ]
  );

  const emitSeek = useCallback(
    (position: number) => {
      if (role !== 'dj') return;

      const timestamp = Date.now();

      const wsService = getWebSocketService({ url: WS_URL });
      wsService.seekAudio(position, timestamp, audioState.trackUrl, audioState.isPlaying);
    },
    [role, audioState.trackUrl, audioState.isPlaying]
  );

  const handleVolumeChange = useCallback(
    (volume: number) => {
      const clampedVolume = Math.max(0, Math.min(100, volume));

      if (Math.abs(clampedVolume - (audioState.volume ?? 0)) < 0.1) {
        return;
      }

      dispatch(setVolumeAction({ volume: clampedVolume }));

      localStorage.setItem(STORAGE_KEYS.VOLUME, clampedVolume.toString());

      const volumeToSet = audioState.isMuted ? 0 : clampedVolume;
      if (isSpotifyTrack(audioState)) {
        setSpotifyVolume(volumeToSet);
      } else if (audioServiceRef.current) {
        try {
          audioServiceRef.current.setVolume(volumeToSet);
        } catch (error) {
          console.error('Error al cambiar volumen:', error);
        }
      }
    },
    [dispatch, audioState.volume, audioState.isMuted, audioState.trackSource, audioState.spotifyId]
  );

  const handleToggleMute = useCallback(() => {
    dispatch(toggleMuteAction());

    const currentState = store.getState().audio;
    const volumeToSet = currentState.isMuted ? 0 : currentState.volume;
    localStorage.setItem(STORAGE_KEYS.IS_MUTED, currentState.isMuted.toString());
    localStorage.setItem(STORAGE_KEYS.PREVIOUS_VOLUME, currentState.previousVolume.toString());

    if (isSpotifyTrack(currentState)) {
      setSpotifyVolume(volumeToSet);
    } else if (audioServiceRef.current) {
      try {
        audioServiceRef.current.setVolume(volumeToSet);
      } catch (error) {
        console.error('Error al cambiar mute:', error);
      }
    }
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (role !== 'dj') return;

    if (tracks.length === 0) return;

    const nextIndex = currentTrackIndex !== null ? (currentTrackIndex + 1) % tracks.length : 0;
    const nextTrack = tracks[nextIndex];

    if (nextTrack) {
      dispatch(setCurrentTrackIndex({ index: nextIndex }));

      dispatch(
        setTrack({
          trackId: nextTrack.id,
          trackUrl: nextTrack.url,
          trackTitle: nextTrack.title,
          trackArtist: nextTrack.artist,
          trackSource: nextTrack.source,
          spotifyId: nextTrack.spotifyId,
        })
      );

      const timestamp = Date.now();
      const wsService = getWebSocketService({ url: WS_URL });
      if (isSpotifyTrack(nextTrack)) {
        wsService.emit('audio:track-change', {
          trackId: nextTrack.id,
          appleMusicId: nextTrack.spotifyId,
          source: 'spotify',
          spotifyId: nextTrack.spotifyId,
          trackSource: 'spotify',
          trackTitle: nextTrack.title,
          trackArtist: nextTrack.artist,
          timestamp,
        });
      } else {
        wsService.emit('audio:track-change', {
          trackId: nextTrack.id,
          trackUrl: nextTrack.url,
          trackTitle: nextTrack.title,
          trackArtist: nextTrack.artist,
          timestamp,
        });
      }

      setTimeout(() => {
        if (isSpotifyTrack(nextTrack)) {
          return;
        }
        if (audioServiceRef.current) {
          audioServiceRef.current.play();
        }
      }, 100);
    }
  }, [role, dispatch, tracks, currentTrackIndex]);

  const handleStop = useCallback(() => {
    if (role !== 'dj') return;

    if (isSpotifyTrack(audioState)) {
      const timestamp = Date.now();
      dispatch(seek({ position: 0, timestamp }));
      dispatch(pause({ timestamp }));
      pauseSpotifyPlayer();
      if (audioState.spotifyId) {
        emitSpotifyState(audioState.spotifyId, 0, false, timestamp);
      }
      return;
    }

    const wsService = getWebSocketService({ url: WS_URL });
    const timestamp = Date.now();

    wsService.seekAudio(0, timestamp, audioState.trackUrl, false);
    wsService.pauseAudio(timestamp, 0, audioState.trackUrl);

    dispatch(seek({ position: 0, timestamp }));
    dispatch(pause({ timestamp }));

    audioServiceRef.current?.seek(0);
    audioServiceRef.current?.pause();
  }, [role, audioState.trackUrl, audioState.spotifyId, audioState.trackSource, dispatch]);

  const handleSelect = useCallback(
    (trackId: string) => {
      if (role !== 'dj') return;
      // Leer tracks del store en el momento de la llamada para evitar closure stale
      // (ej: al añadir track de Spotify y llamar handleSelect desde setTimeout)
      const currentTracks = store.getState().playlist.tracks;
      if (currentTracks.length === 0) return;

      const index = currentTracks.findIndex((t) => t.id === trackId);
      if (index === -1) return;

      const track = currentTracks[index];
      if (!track) return;

      dispatch(setCurrentTrackIndex({ index }));

      dispatch(
        setTrack({
          trackId: track.id,
          trackUrl: track.url,
          trackTitle: track.title,
          trackArtist: track.artist,
          trackSource: track.source,
          spotifyId: track.spotifyId,
        })
      );
      const timestamp = Date.now();
      const wsService = getWebSocketService({ url: WS_URL });
      if (isSpotifyTrack(track)) {
        wsService.emit('audio:track-change', {
          trackId: track.id,
          appleMusicId: track.spotifyId,
          source: 'spotify',
          spotifyId: track.spotifyId,
          trackSource: 'spotify',
          trackTitle: track.title,
          trackArtist: track.artist,
          timestamp,
        });
      } else {
        wsService.emit('audio:track-change', {
          trackId: track.id,
          trackUrl: track.url,
          trackTitle: track.title,
          trackArtist: track.artist,
          timestamp,
        });
      }

      setTimeout(() => {
        if (isSpotifyTrack(track)) {
          return;
        }
        if (audioServiceRef.current) {
          audioServiceRef.current.play();
        }
      }, 100);
    },
    [role, dispatch]
  );

  const handlePrevious = useCallback(() => {
    if (role !== 'dj') return;

    if (audioState.currentPosition < 3 && tracks.length > 0 && currentTrackIndex !== null) {
      const prevIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
      const prevTrack = tracks[prevIndex];

      if (prevTrack) {
        dispatch(setCurrentTrackIndex({ index: prevIndex }));

        dispatch(
          setTrack({
            trackId: prevTrack.id,
            trackUrl: prevTrack.url,
            trackTitle: prevTrack.title,
            trackArtist: prevTrack.artist,
            trackSource: prevTrack.source,
            spotifyId: prevTrack.spotifyId,
          })
        );

        const timestamp = Date.now();
        const wsService = getWebSocketService({ url: WS_URL });
        if (isSpotifyTrack(prevTrack)) {
          wsService.emit('audio:track-change', {
            trackId: prevTrack.id,
            appleMusicId: prevTrack.spotifyId,
            source: 'spotify',
            spotifyId: prevTrack.spotifyId,
            trackSource: 'spotify',
            trackTitle: prevTrack.title,
            trackArtist: prevTrack.artist,
            timestamp,
          });
        } else {
          wsService.emit('audio:track-change', {
            trackId: prevTrack.id,
            trackUrl: prevTrack.url,
            trackTitle: prevTrack.title,
            trackArtist: prevTrack.artist,
            timestamp,
          });
        }
        return;
      }
    }

    const newPosition = audioState.currentPosition < 3 ? 0 : audioState.currentPosition - 10;
    const seekPos = Math.max(0, newPosition);
    const timestamp = Date.now();
    dispatch(seek({ position: seekPos, timestamp }));

    if (isSpotifyTrack(audioState)) {
      seekSpotifyPlayer(seekPos);
    } else if (audioServiceRef.current) {
      audioServiceRef.current.seek(seekPos);
    }

    if (isSpotifyTrack(audioState)) {
      if (audioState.spotifyId) {
        emitSpotifyState(audioState.spotifyId, seekPos, audioState.isPlaying, timestamp);
      }
    } else {
      const wsService = getWebSocketService({ url: WS_URL });
      wsService.seekAudio(seekPos, timestamp);
    }
  }, [
    role,
    dispatch,
    audioState.currentPosition,
    audioState.spotifyId,
    audioState.trackSource,
    tracks,
    currentTrackIndex,
  ]);

  const handleRestart = useCallback(() => {
    if (role !== 'dj') return;

    const timestamp = Date.now();
    dispatch(seek({ position: 0, timestamp }));

    if (isSpotifyTrack(audioState)) {
      seekSpotifyPlayer(0);
      if (audioState.spotifyId) {
        emitSpotifyState(audioState.spotifyId, 0, audioState.isPlaying, timestamp);
      }
      return;
    }

    if (audioServiceRef.current) {
      audioServiceRef.current.seek(0);
    }

    const wsService = getWebSocketService({ url: WS_URL });
    if (wsService.isConnected() && audioState.trackUrl) {
      const isPlaying = audioState.isPlaying ?? false;
      wsService.seekAudio(0, timestamp, audioState.trackUrl);
      if (isPlaying) {
        wsService.playAudio(timestamp, 0, audioState.trackUrl);
      } else {
        wsService.pauseAudio(timestamp, 0, audioState.trackUrl);
      }
    }
  }, [
    role,
    dispatch,
    audioState.trackUrl,
    audioState.isPlaying,
    audioState.spotifyId,
    audioState.trackSource,
  ]);

  useEffect(() => {
    return () => {
      if (audioServiceRef.current) {
        audioServiceRef.current.pause();
        audioServiceRef.current.cleanup();
        audioServiceRef.current = null;
      }
    };
  }, []);

  return {
    audioState,
    isHost: role === 'dj',
    play: handlePlay,
    pause: handlePause,
    seek: handleSeek,
    setVolume: handleVolumeChange,
    toggleMute: handleToggleMute,
    next: handleNext,
    previous: handlePrevious,
    restart: handleRestart,
    stop: handleStop,
    handleSelect,
    emitSeek,
    setNeedsInteraction,
    needsInteraction,
  };
}
