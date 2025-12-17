/**
 * Hook para manejar la conexión WebSocket
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { connecting, connected, disconnected } from '@features/connection/connectionSlice';
import {
  createSessionSuccess,
  createSessionFailure,
  joinSessionSuccess,
  joinSessionFailure,
  leaveSession as leaveSessionAction,
} from '@features/session/sessionSlice';
import { setAudioState, reset as resetAudio } from '@features/audio/audioSlice';
import { syncPlaylist } from '@features/playlist/playlistSlice';
import {
  getWebSocketService,
  initializeWebSocketService,
} from '@services/websocket/websocketService';
import { getAudioService } from '@services/audio/audioService';
import { WS_URL, SOCKET_EVENTS } from '@shared/constants';
import type { AudioState, SessionInfo, Track } from '@shared/types';
import { isValidAudioUrl } from '@shared/utils';
import { store } from '@app/store';

export function useWebSocket() {
  const dispatch = useAppDispatch();
  const { isConnected, latency } = useAppSelector((state) => state.connection);
  const { sessionId, role } = useAppSelector((state) => state.session);

  // Usar ref para acceder al estado actual sin causar re-renders
  const audioStateRef = useRef(store.getState().audio);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);

  // Mantener la referencia actualizada sin causar re-renders
  const updateAudioStateRef = () => {
    audioStateRef.current = store.getState().audio;
  };

  useEffect(() => {
    // Limpiar timeout anterior si existe
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    // Verificar si ya está conectado o conectándose
    let wsService: ReturnType<typeof getWebSocketService>;
    try {
      wsService = getWebSocketService({ url: WS_URL });
    } catch {
      // Si no existe, inicializar pero no conectar todavía
      wsService = initializeWebSocketService({ url: WS_URL });
    }

    // SIEMPRE registrar handlers primero, antes de cualquier otra cosa
    // Esto asegura que no se pierdan eventos cuando el socket se conecta

    // Event handlers - deben registrarse ANTES de conectar para no perder eventos
    const handleConnectionStatus = (data: { connected: boolean }) => {
      if (data.connected) {
        dispatch(connected());
        isConnectingRef.current = false; // Resetear flag cuando se conecta
      } else {
        dispatch(disconnected({}));
      }
    };

    wsService.on(SOCKET_EVENTS.CONNECTION_STATUS, handleConnectionStatus);

    const handleSessionCreated = (data: { sessionId: string }) => {
      dispatch(createSessionSuccess({ sessionId: data.sessionId }));
    };

    const handleSessionJoined = (data: SessionInfo) => {
      dispatch(joinSessionSuccess(data));
    };

    const handleSessionError = (data: { error: string }) => {
      console.error('Error de sesión:', data.error);
      if (role === 'host') {
        dispatch(createSessionFailure({ error: data.error }));
      } else {
        dispatch(joinSessionFailure({ error: data.error }));
      }
    };

    const handleAudioState = (data: AudioState) => {
      if (!data) return;
      // Buscar trackUrl en ambos campos posibles (truckUrl o trackUrl)
      const trackUrl = data.trackUrl || data.truckUrl || '';
      // Actualizar referencia antes de usarla
      updateAudioStateRef();
      const currentAudioState = audioStateRef.current;

      console.log('Estado de audio recibido del servidor:', data);

      // Validar que trackUrl sea válida antes de guardar
      if (trackUrl && !isValidAudioUrl(trackUrl)) {
        console.warn(
          'El servidor envió una URL inválida:',
          trackUrl,
          'Debe ser un archivo de audio válido (ej: .mp3, .wav, etc.)'
        );
        // No actualizar el estado si la URL es inválida
        return;
      }

      // Verificar si hay cambios significativos antes de actualizar
      // Esto previene parpadeos y re-renders innecesarios
      const positionDiff = Math.abs(
        (data.currentPosition || 0) - (currentAudioState?.currentPosition || 0)
      );
      const hasSignificantChange =
        positionDiff > 0.1 || // Cambio de posición > 100ms
        data.isPlaying !== currentAudioState?.isPlaying ||
        // data.trackId !== currentAudioState?.trackId ||
        trackUrl !== currentAudioState?.trackUrl ||
        // data.trackTitle !== currentAudioState?.trackTitle ||
        // data.trackArtist !== currentAudioState?.trackArtist ||
        (data.trackDuration && data.trackDuration !== currentAudioState?.trackDuration);

      // Si no hay cambios significativos, no actualizar (excepto si es la primera vez)
      if (!hasSignificantChange && trackUrl) {
        return;
      }

      // Preservar campos del track si no vienen en el estado del servidor
      // Esto es importante porque el servidor puede enviar solo isPlaying y currentPosition
      // Usamos el estado actual de Redux para preservar los campos que no vienen del servidor
      const audioStateToDispatch: AudioState = {
        ...data,
        // Preservar trackUrl si viene vacía o inválida
        trackUrl: trackUrl,
        trackId: trackUrl,
        // trackTitle: data.trackTitle || currentAudioState?.trackTitle,
        // trackArtist: data.trackArtist || currentAudioState?.trackArtist,
        // Preservar volumen local SIEMPRE (nunca se sincroniza desde el servidor)
        volume: currentAudioState?.volume ?? 100,
        // Preservar duración si no viene
        trackDuration: data.trackDuration || currentAudioState?.trackDuration,
        // Validar que currentPosition sea válido antes de actualizar
        currentPosition:
          isNaN(data.currentPosition) || data.currentPosition < 0
            ? (currentAudioState?.currentPosition ?? 0)
            : data.currentPosition,
      };

      console.log('debugger Current Position', {
        val:
          isNaN(data.currentPosition) || data.currentPosition < 0
            ? (currentAudioState?.currentPosition ?? 0)
            : data.currentPosition,
        role,
        trackUrl,
      });

      dispatch(setAudioState(audioStateToDispatch));

      // IMPORTANTE: Para listeners, actualizar el estado interno del audioService
      // cuando llega audio:state para que pueda reproducir automáticamente
      if (role === 'listener' && trackUrl) {
        try {
          const audioService = getAudioService();
          const audioServiceState = audioService.getState();

          // Siempre sincronizar con el estado del servidor
          // sync() manejará la inicialización si es necesario
          audioService.sync(
            audioStateToDispatch.currentPosition,
            audioStateToDispatch.timestamp,
            audioStateToDispatch.isPlaying,
            trackUrl
          );

          // Si el audioService ya está inicializado, también actualizar el estado interno
          // para asegurar que los valores estén sincronizados
          if (audioServiceState) {
            (audioServiceState as any).isPlaying = audioStateToDispatch.isPlaying;
            (audioServiceState as any).trackUrl = trackUrl;
            (audioServiceState as any).currentPosition = audioStateToDispatch.currentPosition;
            if (audioStateToDispatch.trackDuration) {
              (audioServiceState as any).trackDuration = audioStateToDispatch.trackDuration;
            }
          }
        } catch (error) {
          console.error('Error al actualizar estado interno del audioService:', error);
        }
      }
    };

    const handlePlaylistSync = (data: { tracks: Track[]; currentTrackIndex: number | null }) => {
      console.log('Playlist recibida del servidor:', data);
      if (data.tracks && Array.isArray(data.tracks)) {
        dispatch(syncPlaylist({ tracks: data.tracks, currentTrackIndex: data.currentTrackIndex }));
      }
    };

    const handlePlaybackState = (data: {
      room: string;
      userName: string;
      position: number;
      isPlaying: boolean;
      trackUrl: string;
    }) => {
      // Actualizar referencia antes de usarla
      updateAudioStateRef();
      const currentAudioState = audioStateRef.current;

      console.log('Playback state recibido:', data);

      // Validar que trackUrl sea válida antes de guardar
      if (data.trackUrl && !isValidAudioUrl(data.trackUrl)) {
        console.warn(
          'El servidor envió una URL inválida:',
          data.trackUrl,
          'Debe ser un archivo de audio válido (ej: .mp3, .wav, etc.)'
        );
        return;
      }

      // Convertir playback-state a AudioState
      const audioStateToDispatch: AudioState = {
        isPlaying: data.isPlaying,
        currentPosition:
          isNaN(data.position) || data.position < 0
            ? (currentAudioState?.currentPosition ?? 0)
            : data.position,
        volume: currentAudioState?.volume ?? 100, // Preservar volumen local
        trackId: currentAudioState?.trackId || '', // Intentar preservar trackId si existe
        trackUrl: data.trackUrl || currentAudioState?.trackUrl || '',
        trackTitle: currentAudioState?.trackTitle,
        trackArtist: currentAudioState?.trackArtist,
        trackDuration: currentAudioState?.trackDuration,
        timestamp: Date.now(),
      };

      dispatch(setAudioState(audioStateToDispatch));

      // Para listeners, actualizar el estado interno del audioService
      if (role === 'listener' && audioStateToDispatch.trackUrl) {
        try {
          const audioService = getAudioService();
          const audioServiceState = audioService.getState();

          if (audioServiceState) {
            (audioServiceState as any).isPlaying = audioStateToDispatch.isPlaying;
            (audioServiceState as any).trackUrl = audioStateToDispatch.trackUrl;
            (audioServiceState as any).currentPosition = audioStateToDispatch.currentPosition;
            if (audioStateToDispatch.trackDuration) {
              (audioServiceState as any).trackDuration = audioStateToDispatch.trackDuration;
            }
          }
        } catch (error) {
          console.error('Error al actualizar estado interno del audioService:', error);
        }
      }
    };

    wsService.on(SOCKET_EVENTS.SESSION_CREATED, handleSessionCreated);
    wsService.on(SOCKET_EVENTS.SESSION_JOINED, handleSessionJoined);
    wsService.on(SOCKET_EVENTS.SESSION_ERROR, handleSessionError);
    wsService.on(SOCKET_EVENTS.AUDIO_STATE, handleAudioState);
    wsService.on(SOCKET_EVENTS.PLAYLIST_SYNC, handlePlaylistSync);
    wsService.on(SOCKET_EVENTS.PLAYBACK_STATE, handlePlaybackState);

    wsService.on(SOCKET_EVENTS.PARTICIPANT_JOINED, () => {
      // El servidor debería enviar el conteo actualizado
      // Por ahora, incrementamos manualmente
    });

    wsService.on(SOCKET_EVENTS.PARTICIPANT_LEFT, () => {
      // Similar al anterior
    });

    // Ahora manejar la conexión
    // Si ya está conectado, no hacer nada más
    if (wsService.isConnected()) {
      console.log('WebSocket ya está conectado, handlers registrados');
      return () => {
        // Cleanup solo de handlers, no desconectar
        wsService.off(SOCKET_EVENTS.CONNECTION_STATUS, handleConnectionStatus);
        wsService.off(SOCKET_EVENTS.SESSION_CREATED, handleSessionCreated);
        wsService.off(SOCKET_EVENTS.SESSION_JOINED, handleSessionJoined);
        wsService.off(SOCKET_EVENTS.SESSION_ERROR, handleSessionError);
        wsService.off(SOCKET_EVENTS.AUDIO_STATE, handleAudioState);
        wsService.off(SOCKET_EVENTS.PLAYLIST_SYNC, handlePlaylistSync);
        wsService.off(SOCKET_EVENTS.PLAYBACK_STATE, handlePlaybackState);
      };
    }

    // Si ya se está conectando, esperar
    if (isConnectingRef.current) {
      console.log('WebSocket ya se está conectando, handlers registrados, esperando conexión...');
      return () => {
        // Cleanup solo de handlers
        wsService.off(SOCKET_EVENTS.CONNECTION_STATUS, handleConnectionStatus);
        wsService.off(SOCKET_EVENTS.SESSION_CREATED, handleSessionCreated);
        wsService.off(SOCKET_EVENTS.SESSION_JOINED, handleSessionJoined);
        wsService.off(SOCKET_EVENTS.SESSION_ERROR, handleSessionError);
        wsService.off(SOCKET_EVENTS.AUDIO_STATE, handleAudioState);
        wsService.off(SOCKET_EVENTS.PLAYLIST_SYNC, handlePlaylistSync);
        wsService.off(SOCKET_EVENTS.PLAYBACK_STATE, handlePlaybackState);
      };
    }

    // Si no está conectado y no se está conectando, iniciar conexión
    isConnectingRef.current = true;

    // Esperar 300ms antes de conectar para evitar múltiples conexiones
    connectTimeoutRef.current = setTimeout(() => {
      try {
        // Verificar nuevamente antes de conectar
        if (!wsService.isConnected()) {
          console.log('Conectando WebSocket después de timeout...');
          dispatch(connecting());
          wsService.connect();
        } else {
          console.log('WebSocket ya conectado durante el timeout');
          isConnectingRef.current = false;
        }
      } catch (error) {
        console.error('Error al conectar WebSocket:', error);
        isConnectingRef.current = false;
      }
    }, 300);

    // Cleanup
    return () => {
      // Limpiar timeout si existe
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      isConnectingRef.current = false;

      wsService.off(SOCKET_EVENTS.CONNECTION_STATUS, handleConnectionStatus);
      wsService.off(SOCKET_EVENTS.SESSION_CREATED, handleSessionCreated);
      wsService.off(SOCKET_EVENTS.SESSION_JOINED, handleSessionJoined);
      wsService.off(SOCKET_EVENTS.SESSION_ERROR, handleSessionError);
      wsService.off(SOCKET_EVENTS.AUDIO_STATE, handleAudioState);
      wsService.off(SOCKET_EVENTS.PLAYLIST_SYNC, handlePlaylistSync);
      // No desconectar aquí porque puede ser usado por otros componentes
      // wsService.disconnect();
    };
  }, [dispatch, role]);

  const createSession = useCallback(
    async (name?: string) => {
      try {
        const wsService = getWebSocketService({ url: WS_URL });
        // Si ya está conectado, crear sesión inmediatamente
        if (wsService.isConnected()) {
          await wsService.createSession(name);
          return;
        }

        // Si no está conectado, esperar a que se conecte (máximo 5 segundos)
        const maxAttempts = 50; // 50 intentos * 100ms = 5 segundos
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          if (wsService.isConnected()) {
            await wsService.createSession(name);
            clearInterval(interval);
          } else if (attempts >= maxAttempts) {
            console.error('Timeout: No se pudo conectar al socket después de 5 segundos');
            dispatch(
              createSessionFailure({
                error: 'No se pudo conectar al servidor. Intenta nuevamente.',
              })
            );
            clearInterval(interval);
          }
        }, 100);
      } catch (error) {
        console.error('Error al crear sesión:', error);
        dispatch(createSessionFailure({ error: 'Error al conectar con el servidor' }));
      }
    },
    [dispatch]
  );

  const joinSession = useCallback(
    async (sessionIdToJoin: string) => {
      try {
        const wsService = getWebSocketService({ url: WS_URL });

        // Si ya está conectado, unirse inmediatamente
        if (wsService.isConnected()) {
          console.log('Socket conectado, uniéndose a sesión:', sessionIdToJoin);
          await wsService.joinSession(sessionIdToJoin);
          return;
        }

        // Si no está conectado, esperar a que se conecte (máximo 5 segundos)
        const maxAttempts = 50; // 50 intentos * 100ms = 5 segundos
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          if (wsService.isConnected()) {
            console.log(
              'Socket conectado después de esperar, uniéndose a sesión:',
              sessionIdToJoin
            );
            await wsService.joinSession(sessionIdToJoin);
            clearInterval(interval);
          } else if (attempts >= maxAttempts) {
            console.error('Timeout: No se pudo conectar al socket después de 5 segundos');
            dispatch(
              joinSessionFailure({ error: 'No se pudo conectar al servidor. Intenta nuevamente.' })
            );
            clearInterval(interval);
          }
        }, 100);
      } catch (error) {
        console.error('Error al unirse a sesión:', error);
        dispatch(joinSessionFailure({ error: 'Error al conectar con el servidor' }));
      }
    },
    [dispatch]
  );

  const leaveSession = useCallback(async () => {
    if (sessionId) {
      const wsService = getWebSocketService({ url: WS_URL });
      await wsService.leaveSession(sessionId);

      // Detener audio al salir (solo si está inicializado)
      try {
        const audioService = getAudioService();
        const audioState = audioService.getState();

        // Solo intentar pausar y limpiar si el audio está inicializado
        if (audioState && audioState.trackUrl) {
          try {
            audioService.pause();
          } catch (error) {
            console.warn('Error al pausar audio al salir:', error);
          }
        }

        // Siempre limpiar, cleanup() maneja el caso cuando no está inicializado
        try {
          audioService.cleanup();
        } catch (error) {
          console.warn('Error al limpiar audio al salir:', error);
        }
      } catch (error) {
        console.warn('Error al obtener servicio de audio al salir:', error);
      }

      // Limpiar estado
      dispatch(leaveSessionAction());
      dispatch(resetAudio());
    }
  }, [sessionId, dispatch]);

  return {
    isConnected,
    latency,
    createSession,
    joinSession,
    leaveSession,
  };
}
