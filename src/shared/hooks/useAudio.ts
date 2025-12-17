/**
 * Hook para manejar la reproducción de audio
 */

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

  // Inicializar servicio de audio cuando cambia la URL del track (para todos los roles)
  useEffect(() => {
    // Validar que la URL sea válida antes de inicializar
    if (!audioState.trackUrl || audioState.trackUrl.trim() === '') {
      // Si no hay URL, limpiar el servicio
      if (audioServiceRef.current) {
        audioServiceRef.current.cleanup();
        audioServiceRef.current = null;
      }
      return;
    }

    // Validar que la URL sea válida para audio
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

    // Si ya existe un servicio pero la URL cambió, limpiar y recrear
    if (audioServiceRef.current) {
      const currentUrl = audioServiceRef.current.getState()?.trackUrl;
      if (currentUrl === audioState.trackUrl) {
        // Ya está inicializado con esta URL, solo asegurar volumen
        const currentVolume = audioState.volume || 100;
        try {
          audioServiceRef.current.setVolume(currentVolume);
        } catch (error) {
          console.error('Error al establecer volumen:', error);
        }
        return;
      }
      // Limpiar servicio anterior
      audioServiceRef.current.cleanup();
      audioServiceRef.current = null;
    }

    const audioService = getAudioService();
    audioServiceRef.current = audioService;

    // IMPORTANTE: Para listeners, establecer el estado interno ANTES de inicializar
    // para que canplayHandler pueda reproducir automáticamente si isPlaying es true
    if (role === 'listener') {
      const audioServiceState = audioService.getState();
      if (!audioServiceState) {
        // Establecer estado inicial con valores de Redux
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
        // Actualizar estado existente con valores de Redux
        (audioServiceState as any).isPlaying = audioState.isPlaying || false;
        (audioServiceState as any).currentPosition = audioState.currentPosition || 0;
        (audioServiceState as any).trackUrl = audioState.trackUrl;
        if (audioState.trackDuration) {
          (audioServiceState as any).trackDuration = audioState.trackDuration;
        }
      }
    }

    // Inicializar con el volumen actual
    const currentVolume = audioState.volume || 100;

    // Marcar como cargando
    dispatch(setLoading({ isLoading: true }));
    dispatch(setError({ error: '' }));

    audioService.init(audioState.trackUrl, (state: AudioState & { error?: string }) => {
      // Callback para actualizaciones del estado del audio
      // Si hay un error, manejarlo primero
      if ((state as any).error) {
        dispatch(setError({ error: (state as any).error }));
        dispatch(setLoading({ isLoading: false }));
        return;
      }

      // Validar que el estado sea válido
      if (!state || isNaN(state.currentPosition)) {
        return;
      }

      // Obtener estado actual de Redux para comparar
      const currentReduxState = store.getState().audio;

      // IMPORTANTE: Para listeners, NO actualizar desde el callback del audioService
      // durante la sincronización activa, ya que esto causa ciclos infinitos
      // El estado se actualiza desde useWebSocket cuando llega audio:state
      // Solo actualizar duración si es necesario
      if (role === 'listener') {
        // Solo actualizar duración si cambió y no está definida
        if (state.trackDuration && state.trackDuration !== currentReduxState.trackDuration) {
          dispatch(
            setAudioState({
              ...currentReduxState,
              trackDuration: state.trackDuration,
            })
          );
        }
        // NO actualizar posición ni isPlaying desde aquí para listeners
        // Esto se maneja desde useWebSocket y sync()
        return;
      }

      // Para el host: actualizar normalmente
      // Calcular diferencias
      const positionDiff = Math.abs(
        (state.currentPosition || 0) - (currentReduxState.currentPosition || 0)
      );
      // Umbral para actualizaciones de posición (más grande para evitar actualizaciones excesivas)
      const hasPositionChange = positionDiff > 0.05;
      const hasDurationChange =
        state.trackDuration !== currentReduxState.trackDuration && state.trackDuration;

      // Para el host: NUNCA sobrescribir isPlaying desde el callback del audioService
      // El host controla isPlaying explícitamente a través de los botones

      // Actualizar Redux solo si hay cambios significativos
      // Para el host: solo actualizar posición y duración, nunca isPlaying
      if (
        hasPositionChange ||
        hasDurationChange ||
        (!currentReduxState.trackDuration && state.trackDuration)
      ) {
        // Asegurar que trackUrl sea válida (no una ruta de la app)
        let validTrackUrl = currentReduxState.trackUrl || state.trackUrl;
        if (
          validTrackUrl &&
          (validTrackUrl.startsWith('/host/') || validTrackUrl.startsWith('/listener/'))
        ) {
          console.warn('Intento de usar ruta de app como trackUrl, preservando URL anterior');
          validTrackUrl = state.trackUrl || currentReduxState.trackUrl || '';
        }

        dispatch(setLoading({ isLoading: false }));

        // Para el host: preservar isPlaying de Redux, solo actualizar posición y duración
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

      // Actualizar duración en la playlist cuando se carga
      if (state.trackDuration && currentReduxState.trackId && hasDurationChange) {
        dispatch(
          updateTrackDuration({ trackId: currentReduxState.trackId, duration: state.trackDuration })
        );
      }
    });

    // Establecer volumen después de inicializar (con manejo de errores)
    setTimeout(() => {
      if (audioServiceRef.current) {
        try {
          audioServiceRef.current.setVolume(currentVolume);
        } catch (error) {
          console.error('Error al establecer volumen inicial:', error);
        }
      }
    }, 100);

    return () => {
      // No limpiar aquí porque puede ser usado por otros efectos
      // Solo limpiar cuando cambie la URL o se desmonte el componente
    };
  }, [
    audioState.trackUrl,
    role,
    dispatch,
    audioState.trackId,
    audioState.trackTitle,
    audioState.trackArtist,
  ]);

  // Sincronizar con estado del servidor (solo listeners)
  useEffect(() => {
    if (role !== 'listener' || !audioState.trackUrl) return;

    // El servicio ya está inicializado por el efecto anterior
    if (!audioServiceRef.current) {
      return;
    }

    // Usar intervalo para sincronizar periódicamente en lugar de en cada cambio
    const syncInterval = setInterval(() => {
      if (!audioServiceRef.current) return;

      // Obtener estado actual de Redux directamente
      const currentState = store.getState().audio;

      // Validar que haya trackUrl antes de sincronizar
      if (!currentState.trackUrl) return;

      // Solo sincronizar si hay cambios significativos
      // Reducir el umbral para cambios de posición para mejor sincronización
      const positionDiff = Math.abs(
        lastSyncRef.current.position - (currentState.currentPosition || 0)
      );
      const hasSignificantChange =
        positionDiff > 0.05 || // Cambio de posición > 50ms
        lastSyncRef.current.isPlaying !== currentState.isPlaying ||
        lastSyncRef.current.trackUrl !== currentState.trackUrl ||
        Math.abs((lastSyncRef.current.timestamp || 0) - (currentState.timestamp || 0)) > 500; // Cambio de timestamp > 500ms

      if (!hasSignificantChange && lastSyncRef.current.trackUrl === currentState.trackUrl) {
        return; // No hay cambios significativos, no sincronizar
      }

      // Validar que currentPosition sea válido antes de sincronizar
      const serverPosition = currentState.currentPosition || 0;
      if (isNaN(serverPosition) || serverPosition < 0) {
        return; // Posición inválida, no sincronizar
      }

      // Actualizar referencia
      lastSyncRef.current = {
        position: serverPosition,
        timestamp: currentState.timestamp || Date.now(),
        isPlaying: currentState.isPlaying || false,
        trackUrl: currentState.trackUrl,
      };

      // Sincronizar con el estado del servidor
      try {
        // IMPORTANTE: Actualizar el estado interno del audioService antes de sincronizar
        // para que pueda reproducir automáticamente si el servidor dice que está reproduciendo
        const audioServiceState = audioServiceRef.current.getState();
        if (audioServiceState && audioServiceState.isPlaying !== currentState.isPlaying) {
          // Actualizar estado interno para que sync() pueda reproducir correctamente
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
    }, 200); // Sincronizar cada 200ms para mejor respuesta

    return () => clearInterval(syncInterval);
  }, [role, audioState.trackUrl, dispatch]);

  // Enviar actualizaciones periódicas de posición al servidor (solo host)
  useEffect(() => {
    if (role !== 'host' || !audioState.isPlaying || !audioState.trackUrl) return;

    const interval = setInterval(() => {
      if (audioServiceRef.current && audioState.isPlaying) {
        const currentState = audioServiceRef.current.getState();
        if (currentState && currentState.currentPosition !== undefined) {
          // Enviar actualización de posición al servidor cada segundo
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
    }, 1000); // Enviar cada segundo

    return () => clearInterval(interval);
  }, [role, audioState.isPlaying, audioState.trackUrl, audioState.currentPosition]);

  // Detectar cuando termina una canción y pasar a la siguiente (solo host)
  useEffect(() => {
    if (role !== 'host' || tracks.length === 0) return;

    // Verificar si la canción terminó
    const checkEnded = () => {
      if (
        audioState.isPlaying &&
        audioState.trackDuration &&
        audioState.currentPosition >= audioState.trackDuration - 0.5
      ) {
        // Pasar a la siguiente canción automáticamente
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

          // Notificar al servidor
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
    if (role !== 'host') return; // Solo el host puede controlar

    if (!audioState.trackUrl) {
      console.warn('There is no track loaded to play');
      return;
    }

    if (!audioServiceRef.current) {
      console.warn('AudioService is not initialized');
      return;
    }

    const timestamp = Date.now();

    // Actualizar Redux primero para feedback inmediato
    dispatch(play({ timestamp }));

    // Reproducir localmente
    audioServiceRef.current
      .play()
      .then(() => {
        // Emitir al servidor después de que se reproduzca localmente
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
        // Revertir estado si falla
        dispatch(pause({ timestamp: Date.now() }));
      });
  }, [role, dispatch, audioState.trackUrl]);

  const handlePause = useCallback(() => {
    if (role !== 'host') return; // Solo el host puede controlar

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
      if (role !== 'host') return; // Solo el host puede controlar

      console.log('Debugger handleSeek', position);

      const timestamp = Date.now();
      dispatch(seek({ position, timestamp }));

      // if (audioServiceRef.current) {
      //   audioServiceRef.current.seek(position);
      // }

      const wsService = getWebSocketService({ url: WS_URL });
      wsService.seekAudio(position, timestamp, audioState.trackUrl);
    },
    [role, dispatch, audioState.trackUrl]
  );

  const handleVolumeChange = useCallback(
    (volume: number) => {
      // Volumen es local para cada cliente, no se sincroniza
      const clampedVolume = Math.max(0, Math.min(100, volume));

      // Solo actualizar si hay un cambio real
      if (Math.abs(clampedVolume - (audioState.volume || 0)) < 0.1) {
        return; // No hay cambio significativo
      }

      // Actualizar Redux primero
      dispatch(setVolumeAction({ volume: clampedVolume }));

      // Aplicar volumen al audioService si existe
      // Usar try-catch para prevenir errores que rompan la app
      if (audioServiceRef.current) {
        try {
          audioServiceRef.current.setVolume(clampedVolume);
        } catch (error) {
          console.error('Error al cambiar volumen:', error);
          // No propagar el error para evitar que rompa la app
        }
      }
    },
    [dispatch, audioState.volume]
  );

  const handleNext = useCallback(() => {
    if (role !== 'host') return; // Solo el host puede controlar

    if (tracks.length === 0) return;

    // Obtener siguiente track
    const nextIndex = currentTrackIndex !== null ? (currentTrackIndex + 1) % tracks.length : 0;
    const nextTrack = tracks[nextIndex];

    if (nextTrack) {
      // Actualizar playlist
      dispatch(setCurrentTrackIndex({ index: nextIndex }));

      // Actualizar audio
      dispatch(
        setTrack({
          trackId: nextTrack.id,
          trackUrl: nextTrack.url,
          trackTitle: nextTrack.title,
          trackArtist: nextTrack.artist,
        })
      );

      // Notificar al servidor
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
  }, [role, dispatch, tracks, currentTrackIndex]);

  const handlePrevious = useCallback(() => {
    if (role !== 'host') return; // Solo el host puede controlar

    // Si estamos en los primeros 3 segundos y hay tracks anteriores, ir al track anterior
    if (audioState.currentPosition < 3 && tracks.length > 0 && currentTrackIndex !== null) {
      const prevIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
      const prevTrack = tracks[prevIndex];

      if (prevTrack) {
        // Actualizar playlist
        dispatch(setCurrentTrackIndex({ index: prevIndex }));

        // Actualizar audio
        dispatch(
          setTrack({
            trackId: prevTrack.id,
            trackUrl: prevTrack.url,
            trackTitle: prevTrack.title,
            trackArtist: prevTrack.artist,
          })
        );

        // Notificar al servidor
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

    // Si no hay tracks anteriores o estamos más allá de los 3 segundos, retroceder 10s
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
    if (role !== 'host') return; // Solo el host puede controlar

    const timestamp = Date.now();
    dispatch(seek({ position: 0, timestamp }));

    if (audioServiceRef.current) {
      audioServiceRef.current.seek(0);
    }

    const wsService = getWebSocketService({ url: WS_URL });
    wsService.seekAudio(0, timestamp);
  }, [role, dispatch]);

  // Limpiar audio al desmontar o salir de sesión
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
  };
}
