import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import {
  play,
  pause,
  seek,
  setVolume as setVolumeAction,
  setTrack,
  setAudioState,
  setError,
  setLoading,
} from '@features/audio/audioSlice';
import { setCurrentTrackIndex, updateTrackDuration } from '@features/playlist/playlistSlice';
import { getAudioService } from '@services/audio/audioService';
import { getWebSocketService } from '@services/websocket/websocketService';
import { WS_URL } from '@shared/constants';
import type { AudioState } from '@shared/types';
import { isValidAudioUrl } from '@shared/utils';
import { store } from '@app/store';

export function useAudio() {
  const dispatch = useAppDispatch();
  const audioState = useAppSelector((state) => state.audio);
  const { role } = useAppSelector((state) => state.session);
  const { tracks, currentTrackIndex } = useAppSelector((state) => state.playlist);
  const audioServiceRef = useRef<ReturnType<typeof getAudioService> | null>(null);
  const lastSyncRef = useRef({
    position: 0,
    timestamp: 0,
    isPlaying: false,
    trackUrl: '',
  });

  useEffect(() => {
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
    const audioServiceState = audioService.getState();
    const currentServiceUrl = audioServiceState?.trackUrl || '';

    if (audioServiceRef.current) {
      const currentUrl = audioServiceRef.current.getState()?.trackUrl;
      if (currentUrl === audioState.trackUrl || currentServiceUrl === audioState.trackUrl) {
        const currentVolume = audioState.volume || 100;
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
      if (role === 'listener') {
        (audioServiceState as any).isPlaying = audioState.isPlaying || false;
        (audioServiceState as any).currentPosition = audioState.currentPosition || 0;
        if (audioState.trackDuration) {
          (audioServiceState as any).trackDuration = audioState.trackDuration;
        }
      }
      const currentVolume = audioState.volume || 100;
      try {
        audioService.setVolume(currentVolume);
      } catch (error) {
        console.error('Error al establecer volumen:', error);
      }
      return;
    }

    audioServiceRef.current = audioService;

    if (role === 'listener') {
      const audioServiceState = audioService.getState();
      if (!audioServiceState) {
        (audioService as any).currentState = {
          isPlaying: audioState.isPlaying || false,
          currentPosition: audioState.currentPosition || 0,
          volume: audioState.volume || 100,
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

    const currentVolume = audioState.volume || 100;

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

      if (role === 'listener') {
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
          audioServiceRef.current.setVolume(currentVolume);
        } catch (error) {
          console.error('Error al establecer volumen inicial:', error);
        }
      }
    }, 100);

    return () => {};
  }, [
    audioState.trackUrl,
    role,
    dispatch,
    audioState.trackId,
    audioState.trackTitle,
    audioState.trackArtist,
  ]);

  useEffect(() => {
    if (role !== 'listener' || !audioState.trackUrl) return;

    if (!audioServiceRef.current) {
      return;
    }

    const syncInterval = setInterval(() => {
      if (!audioServiceRef.current) return;

      const currentState = store.getState().audio;

      if (!currentState.trackUrl) return;

      const positionDiff = Math.abs(
        lastSyncRef.current.position - (currentState.currentPosition || 0)
      );
      const hasSignificantChange =
        positionDiff > 0.05 ||
        lastSyncRef.current.isPlaying !== currentState.isPlaying ||
        lastSyncRef.current.trackUrl !== currentState.trackUrl ||
        Math.abs((lastSyncRef.current.timestamp || 0) - (currentState.timestamp || 0)) > 500;

      if (!hasSignificantChange && lastSyncRef.current.trackUrl === currentState.trackUrl) {
        return;
      }

      const serverPosition = currentState.currentPosition || 0;
      if (isNaN(serverPosition) || serverPosition < 0) {
        return;
      }

      lastSyncRef.current = {
        position: serverPosition,
        timestamp: currentState.timestamp || Date.now(),
        isPlaying: currentState.isPlaying || false,
        trackUrl: currentState.trackUrl,
      };

      try {
        const audioServiceState = audioServiceRef.current.getState();
        if (audioServiceState && audioServiceState.isPlaying !== currentState.isPlaying) {
          (audioServiceState as any).isPlaying = currentState.isPlaying;
        }

        audioServiceRef.current.sync(
          serverPosition,
          currentState.timestamp || Date.now(),
          currentState.isPlaying || false,
          currentState.trackUrl
        );
      } catch (error) {
        console.error('Error en sincronización:', error);
      }
    }, 200);

    return () => clearInterval(syncInterval);
  }, [role, audioState.trackUrl, dispatch]);

  useEffect(() => {
    if (role !== 'host' || !audioState.isPlaying || !audioState.trackUrl) return;

    const interval = setInterval(() => {
      if (audioServiceRef.current && audioState.isPlaying) {
        const currentState = audioServiceRef.current.getState();
        if (currentState && currentState.currentPosition !== undefined) {
          try {
            const wsService = getWebSocketService({ url: WS_URL });
            if (wsService.isConnected()) {
              wsService.seekAudio(currentState.currentPosition, Date.now(), audioState.trackUrl);
            }
          } catch (error) {
            console.error('Error al enviar actualización de posición:', error);
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [role, audioState.isPlaying, audioState.trackUrl, audioState.currentPosition]);

  useEffect(() => {
    if (role !== 'host' || tracks.length === 0) return;

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
            })
          );

          const timestamp = Date.now();
          const wsService = getWebSocketService({ url: WS_URL });
          wsService.emit('audio:track-change', {
            trackId: nextTrack.id,
            trackUrl: nextTrack.url,
            trackTitle: nextTrack.title,
            trackArtist: nextTrack.artist,
            timestamp,
          });
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
    if (role !== 'host') return;

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
  }, [role, dispatch, audioState.trackUrl]);

  const handlePause = useCallback(() => {
    if (role !== 'host') return;

    const timestamp = Date.now();
    dispatch(pause({ timestamp }));

    if (audioServiceRef.current) {
      audioServiceRef.current.pause();
    }

    const wsService = getWebSocketService({ url: WS_URL });
    const currentState = audioServiceRef.current?.getState();
    const position = currentState?.currentPosition ?? audioState.currentPosition ?? 0;
    wsService.pauseAudio(timestamp, position, audioState.trackUrl);
  }, [role, dispatch, audioState.trackUrl, audioState.currentPosition]);

  const handleSeek = useCallback(
    (position: number) => {
      if (role !== 'host') return;

      const timestamp = Date.now();
      dispatch(seek({ position, timestamp }));

      if (audioServiceRef.current) {
        audioServiceRef.current.seek(position);
      }

      const wsService = getWebSocketService({ url: WS_URL });
      wsService.seekAudio(position, timestamp, audioState.trackUrl);
    },
    [role, dispatch, audioState.trackUrl]
  );

  const emitSeek = useCallback(
    (position: number) => {
      if (role !== 'host') return;

      const timestamp = Date.now();

      const wsService = getWebSocketService({ url: WS_URL });
      wsService.seekAudio(position, timestamp, audioState.trackUrl);
    },
    [role, audioState.trackUrl]
  );

  const handleVolumeChange = useCallback(
    (volume: number) => {
      const clampedVolume = Math.max(0, Math.min(100, volume));

      if (Math.abs(clampedVolume - (audioState.volume || 0)) < 0.1) {
        return;
      }

      dispatch(setVolumeAction({ volume: clampedVolume }));

      if (audioServiceRef.current) {
        try {
          audioServiceRef.current.setVolume(clampedVolume);
        } catch (error) {
          console.error('Error al cambiar volumen:', error);
        }
      }
    },
    [dispatch, audioState.volume]
  );

  const handleNext = useCallback(() => {
    if (role !== 'host') return;

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
        })
      );

      const timestamp = Date.now();
      const wsService = getWebSocketService({ url: WS_URL });
      wsService.emit('audio:track-change', {
        trackId: nextTrack.id,
        trackUrl: nextTrack.url,
        trackTitle: nextTrack.title,
        trackArtist: nextTrack.artist,
        timestamp,
      });

      setTimeout(() => {
        if (audioServiceRef.current) {
          audioServiceRef.current.play();
        }
      }, 100);
    }
  }, [role, dispatch, tracks, currentTrackIndex]);

  const handlePrevious = useCallback(() => {
    if (role !== 'host') return;

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
          })
        );

        const timestamp = Date.now();
        const wsService = getWebSocketService({ url: WS_URL });
        wsService.emit('audio:track-change', {
          trackId: prevTrack.id,
          trackUrl: prevTrack.url,
          trackTitle: prevTrack.title,
          trackArtist: prevTrack.artist,
          timestamp,
        });
        return;
      }
    }

    const newPosition = audioState.currentPosition < 3 ? 0 : audioState.currentPosition - 10;
    const timestamp = Date.now();
    dispatch(seek({ position: Math.max(0, newPosition), timestamp }));

    if (audioServiceRef.current) {
      audioServiceRef.current.seek(Math.max(0, newPosition));
    }

    const wsService = getWebSocketService({ url: WS_URL });
    wsService.seekAudio(Math.max(0, newPosition), timestamp);
  }, [role, dispatch, audioState.currentPosition, tracks, currentTrackIndex]);

  const handleRestart = useCallback(() => {
    if (role !== 'host') return;

    const timestamp = Date.now();
    dispatch(seek({ position: 0, timestamp }));

    if (audioServiceRef.current) {
      audioServiceRef.current.seek(0);
    }

    const wsService = getWebSocketService({ url: WS_URL });
    wsService.seekAudio(0, timestamp);
  }, [role, dispatch]);

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
    isHost: role === 'host',
    play: handlePlay,
    pause: handlePause,
    seek: handleSeek,
    setVolume: handleVolumeChange,
    next: handleNext,
    previous: handlePrevious,
    restart: handleRestart,
    emitSeek,
  };
}
