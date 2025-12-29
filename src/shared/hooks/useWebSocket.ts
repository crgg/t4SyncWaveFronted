import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { connecting, connected, disconnected } from '@features/connection/connectionSlice';
import {
  createSessionSuccess,
  createSessionFailure,
  joinSessionSuccess,
  joinSessionFailure,
  updateConnectionUsers,
  addConnectionUser,
  removeConnectionUser,
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
import { IRoomUser, IRoomUsers } from '@/features/groups/groups.types';

export function useWebSocket() {
  const dispatch = useAppDispatch();
  const { isConnected, latency } = useAppSelector((state) => state.connection);
  const { sessionId, role } = useAppSelector((state) => state.session);
  const user = useAppSelector((state) => state.auth?.user);
  const socketServiceRef = useRef<ReturnType<typeof getWebSocketService> | null>(null);

  const audioStateRef = useRef(store.getState().audio);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);

  const ping = useCallback(() => {
    const wsService = getWebSocketService({ url: WS_URL });
    if (!wsService.isConnected()) return;
    wsService.ping();
  }, []);

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
      socketServiceRef.current = wsService;
    } catch {
      wsService = initializeWebSocketService({ url: WS_URL });
    }
    const handleConnectionStatus = (data: { connected: boolean; reason?: string }) => {
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
      if (role === 'dj') {
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

      // Para listeners, la sincronización se maneja en useAudio.ts
      // No llamar a sync() aquí para evitar conflictos con el efecto de sincronización
      const currentRole = store.getState().session.role;
      if (currentRole === 'member' && trackUrl) {
        try {
          const audioService = getAudioService();
          const audioServiceState = audioService.getState();

          // Solo actualizar el estado interno del audioService, pero NO llamar a sync()
          // El efecto de sincronización en useAudio.ts se encargará de sincronizar
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
      userId?: string;
      position: number;
      isPlaying: boolean;
      trackUrl: string;
      timestamp?: number;
      duration?: number | null;
      trackTitle?: string | null;
      trackArtist?: string | null;
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

      const clientReceiveTime = Date.now();
      const timestamp = clientReceiveTime;

      // Mapear duration a trackDuration, manejar null
      const trackDuration =
        data.duration !== null && data.duration !== undefined
          ? data.duration
          : currentAudioState?.trackDuration;

      // Mapear trackTitle y trackArtist, manejar null
      const trackTitle =
        data.trackTitle !== null && data.trackTitle !== undefined
          ? data.trackTitle
          : currentAudioState?.trackTitle;

      const trackArtist =
        data.trackArtist !== null && data.trackArtist !== undefined
          ? data.trackArtist
          : currentAudioState?.trackArtist;

      const audioStateToDispatch: AudioState = {
        isPlaying: data.isPlaying,
        currentPosition:
          isNaN(data.position) || data.position < 0
            ? (currentAudioState?.currentPosition ?? 0)
            : data.position,
        volume: currentAudioState?.volume ?? 100,
        trackId: currentAudioState?.trackId || data.trackUrl || '',
        trackUrl: data.trackUrl || currentAudioState?.trackUrl || '',
        trackTitle: trackTitle,
        trackArtist: trackArtist,
        trackDuration: trackDuration,
        timestamp: timestamp,
        truckUrl: data.trackUrl,
      };

      dispatch(setAudioState(audioStateToDispatch));

      const currentRole = store.getState().session.role;
      if (currentRole === 'member' && audioStateToDispatch.trackUrl) {
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

    const handleRoomUsers = (data: IRoomUsers) => dispatch(updateConnectionUsers(data));
    const handleConnectionUserJoined = (data: IRoomUser) => dispatch(addConnectionUser(data));
    const handleConnectionUserLeft = (data: IRoomUser) => dispatch(removeConnectionUser(data));

    wsService.on(SOCKET_EVENTS.SESSION_CREATED, handleSessionCreated);
    wsService.on(SOCKET_EVENTS.SESSION_JOINED, handleSessionJoined);
    wsService.on(SOCKET_EVENTS.SESSION_ERROR, handleSessionError);
    wsService.on(SOCKET_EVENTS.AUDIO_STATE, handleAudioState);
    wsService.on(SOCKET_EVENTS.PLAYLIST_SYNC, handlePlaylistSync);
    wsService.on(SOCKET_EVENTS.PLAYBACK_STATE, handlePlaybackState);
    wsService.on(SOCKET_EVENTS.ROOM_USERS, handleRoomUsers);
    wsService.on(SOCKET_EVENTS.PARTICIPANT_JOINED, handleConnectionUserJoined);
    wsService.on(SOCKET_EVENTS.PARTICIPANT_LEFT, handleConnectionUserLeft);

    if (wsService.isConnected()) {
      return () => {
        wsService.off(SOCKET_EVENTS.CONNECTION_STATUS, handleConnectionStatus);
        wsService.off(SOCKET_EVENTS.SESSION_CREATED, handleSessionCreated);
        wsService.off(SOCKET_EVENTS.SESSION_JOINED, handleSessionJoined);
        wsService.off(SOCKET_EVENTS.SESSION_ERROR, handleSessionError);
        wsService.off(SOCKET_EVENTS.AUDIO_STATE, handleAudioState);
        wsService.off(SOCKET_EVENTS.PLAYLIST_SYNC, handlePlaylistSync);
        wsService.off(SOCKET_EVENTS.PLAYBACK_STATE, handlePlaybackState);
        wsService.off(SOCKET_EVENTS.ROOM_USERS, handleRoomUsers);
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
    async (roomName: string, user: IUserData) => {
      try {
        if (!user) return console.warn('User not found');
        const wsService = getWebSocketService({ url: WS_URL });
        if (wsService.isConnected()) {
          await wsService.createSession(roomName, user);
          return;
        }

        const maxAttempts = 50;
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          if (wsService.isConnected()) {
            await wsService.createSession(roomName, user);
            clearInterval(interval);
          } else if (attempts >= maxAttempts) {
            console.error('Timeout: Could not connect to socket after 5 seconds');
            dispatch(
              createSessionFailure({
                error: 'Could not connect to server. Try again.',
              })
            );
            clearInterval(interval);
          }
        }, 100);
      } catch (error) {
        console.error('Error creating session:', error);
        dispatch(createSessionFailure({ error: 'Error connecting to server' }));
      }
    },
    [dispatch, user?.id]
  );

  const getRoomUsers = useCallback(async () => {
    const wsService = getWebSocketService({ url: WS_URL });
    if (!wsService.isConnected()) return;
    await wsService.getRoomUsers();
  }, [sessionId]);

  const joinSession = useCallback(
    async (sessionIdToJoin: string) => {
      try {
        if (!user) return;
        const wsService = getWebSocketService({ url: WS_URL });

        if (wsService.isConnected()) {
          await wsService.joinSession(sessionIdToJoin, user);
          return;
        }

        const maxAttempts = 50;
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          if (wsService.isConnected()) {
            await wsService.joinSession(sessionIdToJoin, user);
            clearInterval(interval);
          } else if (attempts >= maxAttempts) {
            console.error('Timeout: Could not connect to socket after 5 seconds');
            dispatch(joinSessionFailure({ error: 'Could not connect to server. Try again.' }));
            clearInterval(interval);
          }
        }, 100);
      } catch (error) {
        console.error('Error joining session:', error);
        dispatch(joinSessionFailure({ error: 'Error connecting to server' }));
      }
    },
    [dispatch, user?.id]
  );

  const leaveSession = useCallback(async () => {
    const wsService = getWebSocketService({ url: WS_URL });

    await wsService.leaveSession();

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

    dispatch(resetAudio());
  }, [sessionId, dispatch]);

  return {
    isConnected,
    latency,
    createSession,
    joinSession,
    leaveSession,
    getRoomUsers,
    wsRef: socketServiceRef,
    ping,
  };
}
