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

  const audioStateRef = useRef(store.getState().audio);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);

  const updateAudioStateRef = () => {
    audioStateRef.current = store.getState().audio;
  };

  useEffect(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    let wsService: ReturnType<typeof getWebSocketService>;
    try {
      wsService = getWebSocketService({ url: WS_URL });
    } catch {
      wsService = initializeWebSocketService({ url: WS_URL });
    }
    const handleConnectionStatus = (data: { connected: boolean }) => {
      if (data.connected) {
        dispatch(connected());
        isConnectingRef.current = false;
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
      const trackUrl = data.trackUrl || data.truckUrl || '';
      updateAudioStateRef();
      const currentAudioState = audioStateRef.current;

      if (trackUrl && !isValidAudioUrl(trackUrl)) {
        console.warn(
          'El servidor envió una URL inválida:',
          trackUrl,
          'Debe ser un archivo de audio válido (ej: .mp3, .wav, etc.)'
        );
        return;
      }

      const isNewTrack = trackUrl && trackUrl !== currentAudioState?.trackUrl;
      const positionDiff = Math.abs(
        (data.currentPosition || 0) - (currentAudioState?.currentPosition || 0)
      );
      const hasSignificantChange =
        isNewTrack ||
        positionDiff > 0.1 ||
        data.isPlaying !== currentAudioState?.isPlaying ||
        (data.trackDuration && data.trackDuration !== currentAudioState?.trackDuration);

      if (!hasSignificantChange && trackUrl && currentAudioState?.trackUrl) {
        return;
      }

      const audioStateToDispatch: AudioState = {
        ...data,
        trackUrl: trackUrl,
        trackId: trackUrl,
        volume: currentAudioState?.volume ?? 100,
        trackDuration: data.trackDuration || currentAudioState?.trackDuration,
        currentPosition:
          isNaN(data.currentPosition) || data.currentPosition < 0
            ? (currentAudioState?.currentPosition ?? 0)
            : data.currentPosition,
        timestamp: data.timestamp || Date.now(),
      };

      dispatch(setAudioState(audioStateToDispatch));

      const currentRole = store.getState().session.role;
      if (currentRole === 'listener' && trackUrl) {
        try {
          const audioService = getAudioService();
          const audioServiceState = audioService.getState();

          audioService.sync(
            audioStateToDispatch.currentPosition,
            audioStateToDispatch.timestamp,
            audioStateToDispatch.isPlaying,
            trackUrl
          );

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
      timestamp?: number;
    }) => {
      updateAudioStateRef();
      const currentAudioState = audioStateRef.current;

      if (data.trackUrl && !isValidAudioUrl(data.trackUrl)) {
        console.warn(
          'El servidor envió una URL inválida:',
          data.trackUrl,
          'Debe ser un archivo de audio válido (ej: .mp3, .wav, etc.)'
        );
        return;
      }

      const serverTimestamp = data.timestamp || Date.now();
      const audioStateToDispatch: AudioState = {
        isPlaying: data.isPlaying,
        currentPosition:
          isNaN(data.position) || data.position < 0
            ? (currentAudioState?.currentPosition ?? 0)
            : data.position,
        volume: currentAudioState?.volume ?? 100,
        trackId: currentAudioState?.trackId || '',
        trackUrl: data.trackUrl || currentAudioState?.trackUrl || '',
        trackTitle: currentAudioState?.trackTitle,
        trackArtist: currentAudioState?.trackArtist,
        trackDuration: currentAudioState?.trackDuration,
        timestamp: serverTimestamp,
      };

      dispatch(setAudioState(audioStateToDispatch));

      const currentRole = store.getState().session.role;
      if (currentRole === 'listener' && audioStateToDispatch.trackUrl) {
        try {
          const audioService = getAudioService();
          const audioServiceState = audioService.getState();

          audioService.sync(
            audioStateToDispatch.currentPosition,
            serverTimestamp,
            audioStateToDispatch.isPlaying,
            audioStateToDispatch.trackUrl
          );

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

    wsService.on(SOCKET_EVENTS.PARTICIPANT_JOINED, () => {});

    wsService.on(SOCKET_EVENTS.PARTICIPANT_LEFT, () => {});

    if (wsService.isConnected()) {
      return () => {
        wsService.off(SOCKET_EVENTS.CONNECTION_STATUS, handleConnectionStatus);
        wsService.off(SOCKET_EVENTS.SESSION_CREATED, handleSessionCreated);
        wsService.off(SOCKET_EVENTS.SESSION_JOINED, handleSessionJoined);
        wsService.off(SOCKET_EVENTS.SESSION_ERROR, handleSessionError);
        wsService.off(SOCKET_EVENTS.AUDIO_STATE, handleAudioState);
        wsService.off(SOCKET_EVENTS.PLAYLIST_SYNC, handlePlaylistSync);
        wsService.off(SOCKET_EVENTS.PLAYBACK_STATE, handlePlaybackState);
      };
    }

    if (isConnectingRef.current) {
      return () => {
        wsService.off(SOCKET_EVENTS.CONNECTION_STATUS, handleConnectionStatus);
        wsService.off(SOCKET_EVENTS.SESSION_CREATED, handleSessionCreated);
        wsService.off(SOCKET_EVENTS.SESSION_JOINED, handleSessionJoined);
        wsService.off(SOCKET_EVENTS.SESSION_ERROR, handleSessionError);
        wsService.off(SOCKET_EVENTS.AUDIO_STATE, handleAudioState);
        wsService.off(SOCKET_EVENTS.PLAYLIST_SYNC, handlePlaylistSync);
        wsService.off(SOCKET_EVENTS.PLAYBACK_STATE, handlePlaybackState);
      };
    }

    isConnectingRef.current = true;

    connectTimeoutRef.current = setTimeout(() => {
      try {
        if (!wsService.isConnected()) {
          dispatch(connecting());
          wsService.connect();
        } else {
          isConnectingRef.current = false;
        }
      } catch (error) {
        console.error('Error al conectar WebSocket:', error);
        isConnectingRef.current = false;
      }
    }, 300);

    return () => {
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
    };
  }, [dispatch, role]);

  const createSession = useCallback(
    async (name?: string) => {
      try {
        const wsService = getWebSocketService({ url: WS_URL });
        if (wsService.isConnected()) {
          await wsService.createSession(name);
          return;
        }

        const maxAttempts = 50;
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

        if (wsService.isConnected()) {
          await wsService.joinSession(sessionIdToJoin);
          return;
        }

        const maxAttempts = 50;
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          if (wsService.isConnected()) {
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

      try {
        const audioService = getAudioService();
        const audioState = audioService.getState();

        if (audioState && audioState.trackUrl) {
          try {
            audioService.pause();
          } catch (error) {
            console.warn('Error al pausar audio al salir:', error);
          }
        }

        try {
          audioService.cleanup();
        } catch (error) {
          console.warn('Error al limpiar audio al salir:', error);
        }
      } catch (error) {
        console.warn('Error al obtener servicio de audio al salir:', error);
      }

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
