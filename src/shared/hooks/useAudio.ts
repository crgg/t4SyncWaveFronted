import { useEffect, useCallback, useRef } from 'react';
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
import { WS_URL, STORAGE_KEYS } from '@shared/constants';
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

  // El estado inicial ya se carga desde localStorage en el slice
  // Este efecto asegura que el audioService tenga el volumen correcto al iniciar
  // Se ejecuta después de que el componente se monta y el estado está disponible
  useEffect(() => {
    // Esperar un momento para asegurar que el estado de Redux esté completamente cargado
    const timeoutId = setTimeout(() => {
      if (audioServiceRef.current && audioState.volume !== undefined) {
        try {
          const volumeToSet = audioState.isMuted ? 0 : audioState.volume;
          audioServiceRef.current.setVolume(volumeToSet);
        } catch (error) {
          console.error('Error al establecer volumen inicial:', error);
        }
      }
    }, 50); // Pequeño delay para asegurar que el estado esté cargado

    return () => clearTimeout(timeoutId);
  }, []); // Solo ejecutar una vez al montar

  // Efecto para sincronizar el volumen cuando cambia (incluyendo mute)
  useEffect(() => {
    if (audioServiceRef.current && audioState.volume !== undefined) {
      try {
        // Asegurar que si está muted o volumen es 0, el audio no suene
        const volumeToSet = audioState.isMuted ? 0 : audioState.volume;
        audioServiceRef.current.setVolume(volumeToSet);
      } catch (error) {
        console.error('Error al sincronizar volumen:', error);
      }
    }
  }, [audioState.volume, audioState.isMuted]);

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
    role,
    dispatch,
    audioState.trackId,
    audioState.trackTitle,
    audioState.trackArtist,
  ]);

  useEffect(() => {
    if (role !== 'member' || !audioState.trackUrl) return;

    if (!audioServiceRef.current) {
      return;
    }

    // Función para sincronizar cuando hay un cambio del servidor
    const performSync = () => {
      if (!audioServiceRef.current) return;

      const currentState = store.getState().audio;
      if (!currentState.trackUrl) return;

      // Solo sincronizar cuando hay un cambio real del servidor (basado en timestamp)
      const timestampDiff = Math.abs(
        (lastSyncRef.current.timestamp || 0) - (currentState.timestamp || 0)
      );
      const isPlayingChanged = lastSyncRef.current.isPlaying !== currentState.isPlaying;
      const trackUrlChanged = lastSyncRef.current.trackUrl !== currentState.trackUrl;
      const hasNewServerEvent = timestampDiff > 100 || trackUrlChanged;

      // Solo sincronizar si hay un nuevo evento del servidor O si cambió isPlaying (play/pause)
      const hasSignificantChange = hasNewServerEvent || isPlayingChanged;

      if (!hasSignificantChange && lastSyncRef.current.trackUrl === currentState.trackUrl) {
        return;
      }

      let serverPosition: number;
      let serverTimestamp: number;

      if (hasNewServerEvent) {
        // Nuevo evento del servidor: usar la posición y timestamp del estado actual
        serverPosition = currentState.currentPosition || 0;
        serverTimestamp = currentState.timestamp || Date.now();

        // Actualizar lastSyncRef inmediatamente con los valores del servidor
        lastSyncRef.current = {
          position: serverPosition,
          timestamp: serverTimestamp,
          isPlaying: currentState.isPlaying || false,
          trackUrl: currentState.trackUrl,
        };
      } else if (isPlayingChanged) {
        // Solo cambió isPlaying (play/pause): usar la posición actual del audio
        const audioServiceState = audioServiceRef.current?.getState();
        serverPosition = audioServiceState?.currentPosition ?? lastSyncRef.current.position;
        serverTimestamp = lastSyncRef.current.timestamp;

        // Actualizar solo isPlaying en lastSyncRef
        lastSyncRef.current = {
          ...lastSyncRef.current,
          isPlaying: currentState.isPlaying || false,
        };
      } else {
        return; // No hay cambios significativos
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

    // Sincronizar inmediatamente cuando cambia timestamp o isPlaying
    performSync();

    // También verificar periódicamente por cambios
    const syncInterval = setInterval(performSync, 100);

    return () => clearInterval(syncInterval);
  }, [role, audioState.trackUrl, audioState.timestamp, audioState.isPlaying, dispatch]);

  // Actualización automática del progress para listeners cuando está reproduciendo
  useEffect(() => {
    if (role !== 'member' || !audioState.isPlaying || !audioState.trackUrl) return;

    // Inicializar lastSyncRef con el estado actual cuando se activa el efecto
    const currentState = store.getState().audio;
    const timestampDiff = Math.abs(
      (lastSyncRef.current.timestamp || 0) - (currentState.timestamp || 0)
    );

    // Si hay un nuevo evento del servidor o es la primera vez, actualizar lastSyncRef
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

      // Si se pausó o no hay track, detener la actualización
      if (!currentState.isPlaying || !currentState.trackUrl) {
        return;
      }

      // Verificar si se recibió un nuevo evento del servidor (timestamp diferente)
      const currentTimestamp = currentState.timestamp || Date.now();
      const timestampDiff = Math.abs((lastSyncRef.current.timestamp || 0) - currentTimestamp);

      // Si hay un nuevo evento del servidor, actualizar lastSyncRef con la posición del evento
      if (timestampDiff > 100 || lastSyncRef.current.trackUrl !== currentState.trackUrl) {
        // Cuando hay un nuevo evento, usar la posición actual como posición base del servidor
        lastSyncRef.current = {
          position: currentState.currentPosition || 0,
          timestamp: currentTimestamp,
          isPlaying: currentState.isPlaying || false,
          trackUrl: currentState.trackUrl,
        };
        // No actualizar progress aquí, solo actualizar la referencia base
        return;
      }

      // Solo calcular progress si estamos reproduciendo y no hay nuevo evento del servidor
      if (!lastSyncRef.current.isPlaying) {
        return;
      }

      // Calcular la posición actual basándose en el timestamp y la posición inicial del último evento
      const serverTimestamp = lastSyncRef.current.timestamp || currentTimestamp;
      const serverPosition = lastSyncRef.current.position;
      const timeSinceUpdate = (Date.now() - serverTimestamp) / 1000; // en segundos
      const calculatedPosition = serverPosition + timeSinceUpdate;

      // Asegurarse de que no exceda la duración del track
      const maxPosition = currentState.trackDuration
        ? Math.min(calculatedPosition, currentState.trackDuration)
        : calculatedPosition;

      // Solo actualizar si hay una diferencia significativa (más de 0.1 segundos)
      // y asegurarse de que la posición calculada sea mayor o igual a la actual
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
    }, 100); // Actualizar cada 100ms para un progress suave

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
    if (role !== 'dj') return;

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
    if (role !== 'dj') return;
    if (audioServiceRef.current) {
      audioServiceRef.current.pause();
    }

    const timestamp = Date.now();
    dispatch(pause({ timestamp }));

    const wsService = getWebSocketService({ url: WS_URL });
    const currentState = audioServiceRef.current?.getState();
    const position = currentState?.currentPosition ?? audioState.currentPosition ?? 0;
    wsService.pauseAudio(timestamp, position, audioState.trackUrl);
  }, [role, dispatch, audioState.trackUrl, audioState.currentPosition]);

  const handleSeek = useCallback(
    (position: number) => {
      if (role !== 'dj') return;

      const timestamp = Date.now();
      dispatch(seek({ position, timestamp }));

      if (audioServiceRef.current) {
        audioServiceRef.current.seek(position);
      }

      const wsService = getWebSocketService({ url: WS_URL });
      wsService.seekAudio(position, timestamp, audioState.trackUrl, audioState.isPlaying);
    },
    [role, dispatch, audioState.trackUrl, audioState.isPlaying]
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

      // Guardar volumen en localStorage (incluso si es 0)
      localStorage.setItem(STORAGE_KEYS.VOLUME, clampedVolume.toString());

      if (audioServiceRef.current) {
        try {
          // Si está muted, mantener el volumen en 0
          const volumeToSet = audioState.isMuted ? 0 : clampedVolume;
          audioServiceRef.current.setVolume(volumeToSet);
        } catch (error) {
          console.error('Error al cambiar volumen:', error);
        }
      }
    },
    [dispatch, audioState.volume, audioState.isMuted]
  );

  const handleToggleMute = useCallback(() => {
    dispatch(toggleMuteAction());

    if (audioServiceRef.current) {
      try {
        const currentState = store.getState().audio;
        // Asegurar que si está muted, el volumen sea 0
        const volumeToSet = currentState.isMuted ? 0 : currentState.volume;
        audioServiceRef.current.setVolume(volumeToSet);

        // Guardar estado de muted en localStorage
        localStorage.setItem(STORAGE_KEYS.IS_MUTED, currentState.isMuted.toString());
        localStorage.setItem(STORAGE_KEYS.PREVIOUS_VOLUME, currentState.previousVolume.toString());
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

  const handleStop = useCallback(() => {
    if (role !== 'dj') return;

    const wsService = getWebSocketService({ url: WS_URL });
    const timestamp = Date.now();

    wsService.seekAudio(0, timestamp, audioState.trackUrl, false);
    wsService.pauseAudio(timestamp, 0, audioState.trackUrl);

    dispatch(seek({ position: 0, timestamp }));
    dispatch(pause({ timestamp }));

    audioServiceRef.current?.seek(0);
    audioServiceRef.current?.pause();
  }, [role, audioState.trackUrl, dispatch]);

  const handleSelect = useCallback(
    (trackId: string) => {
      if (role !== 'dj') return;

      if (tracks.length === 0) return;

      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;

      const nextIndex = currentTrackIndex !== null ? (currentTrackIndex + 1) % tracks.length : 0;
      dispatch(setCurrentTrackIndex({ index: nextIndex }));

      dispatch(
        setTrack({
          trackId: track.id,
          trackUrl: track.url,
          trackTitle: track.title,
          trackArtist: track.artist,
        })
      );
      const timestamp = Date.now();
      const wsService = getWebSocketService({ url: WS_URL });
      wsService.emit('audio:track-change', {
        trackId: track.id,
        trackUrl: track.url,
        trackTitle: track.title,
        trackArtist: track.artist,
        timestamp,
      });

      setTimeout(() => {
        if (audioServiceRef.current) {
          audioServiceRef.current.play();
        }
      }, 100);
    },
    [role, dispatch, tracks, currentTrackIndex]
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
    if (role !== 'dj') return;

    const timestamp = Date.now();
    dispatch(seek({ position: 0, timestamp }));

    if (audioServiceRef.current) {
      audioServiceRef.current.seek(0);
    }

    const wsService = getWebSocketService({ url: WS_URL });
    if (wsService.isConnected() && audioState.trackUrl) {
      const isPlaying = audioState.isPlaying ?? false;

      // Enviar seek con trackUrl para que se emita PLAYBACK_STATE
      wsService.seekAudio(0, timestamp, audioState.trackUrl);

      // Enviar el play-state correcto para mantener el estado de reproducción
      if (isPlaying) {
        wsService.playAudio(timestamp, 0, audioState.trackUrl);
      } else {
        wsService.pauseAudio(timestamp, 0, audioState.trackUrl);
      }
    }
  }, [role, dispatch, audioState.trackUrl, audioState.isPlaying]);

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
  };
}
