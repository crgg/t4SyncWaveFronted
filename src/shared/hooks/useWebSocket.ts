import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@app/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { connecting, connected, disconnected } from '@features/connection/connectionSlice';
import {
  createSessionSuccess,
  createSessionFailure,
  joinSessionSuccess,
  joinSessionFailure,
  updateConnectionUsers,
  addConnectionUser,
  removeConnectionUser,
  handleKicked,
} from '@features/session/sessionSlice';
import { setAudioState, reset as resetAudio } from '@features/audio/audioSlice';
import { playListSelectors, syncPlaylist } from '@features/playlist/playlistSlice';
import {
  getWebSocketService,
  initializeWebSocketService,
} from '@services/websocket/websocketService';
import { getAudioService } from '@services/audio/audioService';
import {
  seekSpotifyPlayer,
  resumeSpotifyPlayer,
  pauseSpotifyPlayer,
  playSpotifyTrack,
} from '@features/spotify/spotifyPlayerService';
import { WS_URL, SOCKET_EVENTS } from '@shared/constants';
import type { AudioState, SessionInfo, Track } from '@shared/types';
import {
  isValidAudioUrl,
  isSpotifyUrl,
  extractSpotifyId,
  compensatePositionSeconds,
  SPOTIFY_PLAY_OVERHEAD_MS,
  SPOTIFY_SEEK_OVERHEAD_MS,
} from '@shared/utils';
import { store } from '@app/store';
import { IRoomUser, IRoomUsers } from '@/features/groups/groups.types';
import { groupsApi } from '@/features/groups/groupsApi';
import { toast } from 'react-toastify';
import { paths } from '@/routes/paths';

export function useWebSocket() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isConnected, latency } = useAppSelector((state) => state.connection);
  const { sessionId, role } = useAppSelector((state) => state.session);
  const countTracks = useAppSelector(playListSelectors.countTracks);
  const user = useAppSelector((state) => state.auth?.user);
  const socketServiceRef = useRef<ReturnType<typeof getWebSocketService> | null>(null);
  const { groupId } = useParams();
  const navigate = useNavigate();
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

      // TODO
      if (countTracks === 0) {
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      }

      const rawTrackUrl = data.trackUrl || (data as any).truckUrl || '';
      // Resolve Spotify ID: explicit field first, then extract from trackUrl if it's a Spotify URL.
      // The server may return source:"mp3" with a Spotify URL in trackUrl.
      const resolvedSpotifyId =
        (data as any).appleMusicId || data.spotifyId || extractSpotifyId(rawTrackUrl) || null;
      const resolvedSource = (data as any).source || data.trackSource || null;
      const isSpotify =
        resolvedSource === 'spotify' || !!resolvedSpotifyId || isSpotifyUrl(rawTrackUrl);

      // For Spotify tracks use empty string as trackUrl — the Spotify SDK handles playback
      const newTrackUrl = isSpotify ? '' : rawTrackUrl;
      updateAudioStateRef();
      const currentAudioState = audioStateRef.current;

      // Spotify tracks don't have a traditional file URL — skip URL validation
      if (!isSpotify && newTrackUrl && !isValidAudioUrl(newTrackUrl)) {
        console.warn(
          'El servidor envió una URL inválida:',
          newTrackUrl,
          'Debe ser un archivo de audio válido (ej: .mp3, .wav, etc.)'
        );
        return;
      }

      // Compensate position for network latency so the listener starts in sync with the host.
      // We use the message's own timestamp (most accurate) with a rolling-median fallback.
      const compensatedPosition = compensatePositionSeconds(
        data.currentPosition || 0,
        data.timestamp,
        data.isPlaying
      );

      const isNewTrack = isSpotify
        ? resolvedSpotifyId !== currentAudioState?.spotifyId
        : newTrackUrl && newTrackUrl !== currentAudioState?.trackUrl;
      const positionDiff = Math.abs(
        compensatedPosition - (currentAudioState?.currentPosition || 0)
      );
      const hasSignificantChange =
        isNewTrack ||
        positionDiff > 0.5 ||
        data.isPlaying !== currentAudioState?.isPlaying ||
        (data.trackDuration && data.trackDuration !== currentAudioState?.trackDuration);

      if (!isSpotify && !hasSignificantChange && newTrackUrl && currentAudioState?.trackUrl) {
        return;
      }

      const audioStateToDispatch: AudioState = {
        ...data,
        trackUrl: newTrackUrl || currentAudioState?.trackUrl || '',
        trackId: isSpotify
          ? currentAudioState?.trackId || resolvedSpotifyId || ''
          : newTrackUrl || currentAudioState?.trackId || '',
        // Preserve local volume — never override from backend
        volume: currentAudioState?.volume ?? 100,
        trackDuration: data.trackDuration || currentAudioState?.trackDuration,
        // Use latency-compensated position so the UI shows the "real now" position
        currentPosition: compensatedPosition,
        timestamp: data.timestamp || Date.now(),
        ...(isSpotify && { spotifyId: resolvedSpotifyId, trackSource: 'spotify' }),
      } as AudioState;

      dispatch(setAudioState(audioStateToDispatch));

      const currentRole = store.getState().session.role;
      if (currentRole === 'member') {
        if (isSpotify && resolvedSpotifyId) {
          // Sync Spotify playback for listener.
          // If the track changed (or nothing was loaded), start via REST API.
          // If it's the same track, just seek + resume/pause.
          const isNewSpotifyTrack = resolvedSpotifyId !== currentAudioState?.spotifyId;
          try {
            if (data.isPlaying) {
              if (isNewSpotifyTrack) {
                // Include Spotify API startup overhead so the listener lands at the right spot
                const startPositionMs =
                  compensatePositionSeconds(
                    data.currentPosition || 0,
                    data.timestamp,
                    true,
                    SPOTIFY_PLAY_OVERHEAD_MS
                  ) * 1000;
                playSpotifyTrack(resolvedSpotifyId, startPositionMs).catch((err) =>
                  console.error('Error starting Spotify track for listener:', err)
                );
              } else {
                const seekPositionS = compensatePositionSeconds(
                  data.currentPosition || 0,
                  data.timestamp,
                  true,
                  SPOTIFY_SEEK_OVERHEAD_MS
                );
                seekSpotifyPlayer(seekPositionS)
                  .then(() => resumeSpotifyPlayer())
                  .catch((err) => console.error('Error syncing Spotify play for listener:', err));
              }
            } else {
              pauseSpotifyPlayer()
                .then(() => seekSpotifyPlayer(compensatedPosition))
                .catch((err) => console.error('Error syncing Spotify pause for listener:', err));
            }
          } catch (error) {
            console.error('Error al sincronizar Spotify para el listener:', error);
          }
        } else if (newTrackUrl) {
          // Sync file-based audio for listener
          try {
            const audioService = getAudioService();
            const audioServiceState = audioService.getState();

            if (newTrackUrl !== audioServiceState?.trackUrl) {
              audioService.sync(
                compensatedPosition,
                data.timestamp || Date.now(),
                data.isPlaying,
                newTrackUrl
              );
            } else {
              if (audioServiceState) {
                (audioServiceState as any).isPlaying = audioStateToDispatch.isPlaying;
                (audioServiceState as any).trackUrl = newTrackUrl;
                (audioServiceState as any).currentPosition = compensatedPosition;
                if (audioStateToDispatch.trackDuration) {
                  (audioServiceState as any).trackDuration = audioStateToDispatch.trackDuration;
                }
              }
            }
          } catch (error) {
            console.error('Error al actualizar estado interno del audioService:', error);
          }
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
      trackUrl: string | null;
      timestamp?: number;
      duration?: number | null;
      trackTitle?: string | null;
      trackArtist?: string | null;
      // Server-side field names
      appleMusicId?: string | null;
      source?: string | null;
      // Client-side field names (backward compat)
      spotifyId?: string;
      trackSource?: string;
    }) => {
      updateAudioStateRef();
      const currentAudioState = audioStateRef.current;

      // Resolve Spotify ID: explicit field first, then extract from trackUrl if it's a Spotify URL.
      // The server may return source:"mp3" with a Spotify URL in trackUrl.
      const resolvedSpotifyId =
        data.appleMusicId || data.spotifyId || extractSpotifyId(data.trackUrl || '') || null;
      const resolvedSource = data.source || data.trackSource || null;
      const isSpotify =
        resolvedSource === 'spotify' || !!resolvedSpotifyId || isSpotifyUrl(data.trackUrl);

      // Spotify tracks don't have a traditional file URL — skip URL validation
      if (!isSpotify && data.trackUrl && !isValidAudioUrl(data.trackUrl)) {
        console.warn(
          'El servidor envió una URL inválida:',
          data.trackUrl,
          'Debe ser un archivo de audio válido (ej: .mp3, .wav, etc.)'
        );
        return;
      }

      const serverTimestamp = data.timestamp ?? undefined;
      const rawPosition =
        isNaN(data.position) || data.position < 0
          ? (currentAudioState?.currentPosition ?? 0)
          : data.position;

      // Compensate for the time the message spent in transit so the listener
      // starts at the position the track is actually at right now.
      const currentPosition = compensatePositionSeconds(
        rawPosition,
        serverTimestamp,
        data.isPlaying
      );

      if (isSpotify) {
        const audioStateToDispatch: AudioState = {
          isPlaying: data.isPlaying,
          currentPosition,
          volume: currentAudioState?.volume ?? 100,
          trackId: currentAudioState?.trackId || resolvedSpotifyId || '',
          trackUrl: currentAudioState?.trackUrl || '',
          trackTitle: data.trackTitle ?? currentAudioState?.trackTitle,
          trackArtist: data.trackArtist ?? currentAudioState?.trackArtist,
          trackDuration: currentAudioState?.trackDuration,
          timestamp: serverTimestamp ?? Date.now(),
          spotifyId: resolvedSpotifyId ?? undefined,
          trackSource: 'spotify',
        };

        dispatch(setAudioState(audioStateToDispatch));

        const currentRole = store.getState().session.role;
        if (currentRole === 'member' && resolvedSpotifyId) {
          // If the track changed (or nothing was loaded), start via REST API (PUT /me/player/play).
          // If it's the same track, seek + resume/pause is enough.
          const isNewSpotifyTrack = resolvedSpotifyId !== currentAudioState?.spotifyId;
          try {
            if (data.isPlaying) {
              if (isNewSpotifyTrack) {
                // Add Spotify API startup overhead to the position compensation
                const startPositionMs =
                  compensatePositionSeconds(
                    rawPosition,
                    serverTimestamp,
                    true,
                    SPOTIFY_PLAY_OVERHEAD_MS
                  ) * 1000;
                playSpotifyTrack(resolvedSpotifyId, startPositionMs).catch((err) =>
                  console.error('Error starting Spotify track for listener:', err)
                );
              } else {
                const seekPositionS = compensatePositionSeconds(
                  rawPosition,
                  serverTimestamp,
                  true,
                  SPOTIFY_SEEK_OVERHEAD_MS
                );
                seekSpotifyPlayer(seekPositionS)
                  .then(() => resumeSpotifyPlayer())
                  .catch((err) => console.error('Error syncing Spotify play for listener:', err));
              }
            } else {
              pauseSpotifyPlayer()
                .then(() => seekSpotifyPlayer(currentPosition))
                .catch((err) => console.error('Error syncing Spotify pause for listener:', err));
            }
          } catch (error) {
            console.error('Error al sincronizar Spotify para el listener:', error);
          }
        }
        return;
      }

      // File-based track
      const trackDuration =
        data.duration !== null && data.duration !== undefined
          ? data.duration
          : currentAudioState?.trackDuration;

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
        currentPosition,
        // Preserve local volume — never override from backend
        volume: currentAudioState?.volume ?? 100,
        trackId: currentAudioState?.trackId || data.trackUrl || '',
        trackUrl: data.trackUrl || currentAudioState?.trackUrl || '',
        trackTitle: trackTitle,
        trackArtist: trackArtist,
        trackDuration: trackDuration,
        timestamp: serverTimestamp ?? Date.now(),
        truckUrl: data.trackUrl,
      } as AudioState;

      dispatch(setAudioState(audioStateToDispatch));

      const currentRole = store.getState().session.role;
      if (currentRole === 'member' && audioStateToDispatch.trackUrl) {
        try {
          const audioService = getAudioService();
          const audioServiceState = audioService.getState();

          if (audioServiceState) {
            (audioServiceState as any).isPlaying = audioStateToDispatch.isPlaying;
            (audioServiceState as any).trackUrl = audioStateToDispatch.trackUrl;
            // Use latency-compensated position for the audio service too
            (audioServiceState as any).currentPosition = currentPosition;
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
    const handleConnectionUserJoined = (data: IRoomUser) => {
      dispatch(addConnectionUser(data));

      // Si somos el DJ y hay un nuevo listener conectándose, enviar el estado de reproducción actual
      const currentRole = store.getState().session.role;
      const currentAudioState = store.getState().audio;
      const sessionId = store.getState().session.sessionName;

      if (
        currentRole === 'dj' &&
        (currentAudioState.trackUrl || currentAudioState.spotifyId) &&
        sessionId
      ) {
        try {
          const audioService = getAudioService();
          const audioServiceState = audioService.getState();
          const currentPosition =
            audioServiceState?.currentPosition ?? currentAudioState.currentPosition ?? 0;
          // timestamp MUST be accurate: listeners use it to compensate for network latency
          const timestamp = Date.now();

          wsService.emit(SOCKET_EVENTS.PLAYBACK_STATE, {
            room: sessionId,
            userName: store.getState().auth.user?.name || 'DJ',
            position: currentPosition, // seconds
            isPlaying: currentAudioState.isPlaying || false,
            trackUrl: currentAudioState.trackUrl || null,
            duration: currentAudioState.trackDuration || null,
            trackTitle: currentAudioState.trackTitle || null,
            trackArtist: currentAudioState.trackArtist || null,
            // Spotify fields so the listener can detect and play via SDK
            appleMusicId: currentAudioState.spotifyId || null,
            source: currentAudioState.trackSource || null,
            timestamp, // critical for latency compensation
          });
        } catch (error) {
          console.error('Error al enviar playback-state al nuevo listener:', error);
        }
      }
    };
    const handleConnectionUserLeft = (data: IRoomUser) => dispatch(removeConnectionUser(data));

    const handleMemberJoined = (data: {
      type: string;
      room: string;
      member: {
        userId: string;
        name: string;
        email: string;
        avatar_url?: string | null;
        role: string;
      };
    }) => {
      // Enviar automáticamente playback-state
      const groupId = data.room;
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      }
    };

    const handleMemberLeft = (data: {
      type: string;
      room: string;
      member: {
        userId: string;
        name: string;
        reason?: string;
      };
    }) => {
      const currentUsers = store.getState().session.connectionUsers;
      const userToRemove = Object.values(currentUsers).find(
        (user) => user.odooUserId === data.member.userId
      );
      if (userToRemove) {
        dispatch(removeConnectionUser(userToRemove));
      }
      const groupId = data.room;
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      }
    };

    const handleKickedEvent = (data: { reason: string }) => {
      dispatch(handleKicked({ reason: data.reason }));
      const listenersPath = '/listeners';
      if (window.location.pathname !== listenersPath) {
        navigate(paths.LISTENERS(null));
        queryClient.invalidateQueries({ queryKey: ['others-groups', { userId: user?.id }] });
        toast.warning('You have been removed from the group', { autoClose: 3000 });
      }
      console.warn('Usuario removido del grupo:', data.reason);
    };

    const handlePlaybackEvent = (data: {
      event: 'playback-play' | 'playback-pause';
      groupId?: string;
      trackId?: string;
      position?: number;
      isPlaying?: boolean;
      trackUrl?: string;
      trackTitle?: string;
      trackArtist?: string;
      duration?: number;
    }) => {
      // Este evento se maneja principalmente en webrtcSFUService
      // pero también podemos manejarlo aquí para actualizar el estado
      if (data.event === 'playback-play' || data.event === 'playback-pause') {
        const currentState = store.getState().audio;
        const audioStateToDispatch: AudioState = {
          isPlaying: data.isPlaying ?? data.event === 'playback-play',
          currentPosition:
            data.position !== undefined ? data.position / 1000 : currentState.currentPosition || 0, // Convertir de ms a segundos
          volume: currentState.volume ?? 100,
          trackId: data.trackId || currentState.trackId || '',
          trackUrl: data.trackUrl || currentState.trackUrl || '',
          trackTitle: data.trackTitle || currentState.trackTitle,
          trackArtist: data.trackArtist || currentState.trackArtist,
          trackDuration: data.duration ? data.duration / 1000 : currentState.trackDuration, // Convertir de ms a segundos
          timestamp: Date.now(),
        };

        dispatch(setAudioState(audioStateToDispatch));

        // Si somos listeners, sincronizar el audio
        const currentRole = store.getState().session.role;
        if (currentRole === 'member' && audioStateToDispatch.trackUrl) {
          try {
            const audioService = getAudioService();
            audioService.sync(
              audioStateToDispatch.currentPosition,
              audioStateToDispatch.timestamp,
              audioStateToDispatch.isPlaying,
              audioStateToDispatch.trackUrl
            );
          } catch (error) {
            console.error('Error al sincronizar audio con playback-event:', error);
          }
        }
      }
    };

    const handleDJStatusChange = async (data: {
      userId?: string;
      groupId?: string;
      state?: string;
    }) => {
      const currentUser = store.getState().auth.user;
      const currentRole = store.getState().session.role;

      // Solo procesar si somos el DJ que regresó
      if (currentRole === 'dj' && currentUser && data.userId === currentUser.id && data.groupId) {
        try {
          // Primero validar si puede tomar control
          const validationResult = await groupsApi.validateControl(data.groupId);

          if (!validationResult.status) {
            console.warn('DJ no puede tomar control:', validationResult.msg);
            return;
          }

          // Obtener el estado del grupo
          const groupState = await groupsApi.getGroupState(data.groupId);

          // Si el estado es PLAYING_NO_HOST o CONTROL_AVAILABLE, obtener el estado de reproducción
          if (
            groupState.status &&
            (groupState.state?.state === 'PLAYING_NO_HOST' ||
              groupState.state?.state === 'CONTROL_AVAILABLE')
          ) {
            // Llamar al endpoint para obtener el estado de reproducción
            const playbackState = await groupsApi.getGroupPlaybackState(data.groupId);

            if (playbackState.status && playbackState.playbackState) {
              const { playbackState: state } = playbackState;

              // Sincronizar el estado local con el estado remoto
              if (state.trackId && state.trackUrl) {
                const audioState: AudioState = {
                  isPlaying: state.isPlaying,
                  currentPosition: state.position ? state.position / 1000 : 0, // Convertir de ms a segundos
                  volume: store.getState().audio.volume ?? 100,
                  trackId: state.trackId,
                  trackUrl: state.trackUrl,
                  trackTitle: state.trackTitle || undefined,
                  trackArtist: state.trackArtist || undefined,
                  trackDuration: state.duration ? state.duration / 1000 : undefined, // Convertir de ms a segundos
                  timestamp: Date.now(),
                };

                dispatch(setAudioState(audioState));

                // Inicializar y sincronizar el audio
                const audioService = getAudioService();
                audioService.sync(
                  audioState.currentPosition,
                  audioState.timestamp,
                  audioState.isPlaying,
                  audioState.trackUrl
                );
              }
            }
          }
        } catch (error) {
          console.error('Error al obtener estado de reproducción después de DJ_RETURN:', error);
        }
      }
    };

    wsService.on(SOCKET_EVENTS.SESSION_CREATED, handleSessionCreated);
    wsService.on(SOCKET_EVENTS.SESSION_JOINED, handleSessionJoined);
    wsService.on(SOCKET_EVENTS.SESSION_ERROR, handleSessionError);
    wsService.on(SOCKET_EVENTS.AUDIO_STATE, handleAudioState);
    wsService.on(SOCKET_EVENTS.PLAYLIST_SYNC, handlePlaylistSync);
    wsService.on(SOCKET_EVENTS.PLAYBACK_STATE, handlePlaybackState);
    wsService.on(SOCKET_EVENTS.ROOM_USERS, handleRoomUsers);
    wsService.on(SOCKET_EVENTS.PARTICIPANT_JOINED, handleConnectionUserJoined);
    wsService.on(SOCKET_EVENTS.PARTICIPANT_LEFT, handleConnectionUserLeft);
    wsService.on(SOCKET_EVENTS.MEMBER_JOINED, handleMemberJoined);
    wsService.on(SOCKET_EVENTS.MEMBER_LEFT, handleMemberLeft);
    wsService.on(SOCKET_EVENTS.KICKED, handleKickedEvent);
    wsService.on(SOCKET_EVENTS.PLAYBACK_EVENT, handlePlaybackEvent);
    wsService.on(SOCKET_EVENTS.DJ_RETURN, handleDJStatusChange);

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
        wsService.off(SOCKET_EVENTS.PARTICIPANT_JOINED, handleConnectionUserJoined);
        wsService.off(SOCKET_EVENTS.PARTICIPANT_LEFT, handleConnectionUserLeft);
        wsService.off(SOCKET_EVENTS.MEMBER_JOINED, handleMemberJoined);
        wsService.off(SOCKET_EVENTS.MEMBER_LEFT, handleMemberLeft);
        wsService.off(SOCKET_EVENTS.KICKED, handleKickedEvent);
        wsService.off(SOCKET_EVENTS.PLAYBACK_EVENT, handlePlaybackEvent);
        wsService.off(SOCKET_EVENTS.DJ_RETURN, handleDJStatusChange);
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
        wsService.off(SOCKET_EVENTS.MEMBER_JOINED, handleMemberJoined);
        wsService.off(SOCKET_EVENTS.MEMBER_LEFT, handleMemberLeft);
        wsService.off(SOCKET_EVENTS.KICKED, handleKickedEvent);
        wsService.off(SOCKET_EVENTS.PLAYBACK_EVENT, handlePlaybackEvent);
        wsService.off(SOCKET_EVENTS.DJ_RETURN, handleDJStatusChange);
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
      wsService.off(SOCKET_EVENTS.MEMBER_JOINED, handleMemberJoined);
      wsService.off(SOCKET_EVENTS.MEMBER_LEFT, handleMemberLeft);
      wsService.off(SOCKET_EVENTS.KICKED, handleKickedEvent);
      wsService.off(SOCKET_EVENTS.PLAYBACK_EVENT, handlePlaybackEvent);
      wsService.off(SOCKET_EVENTS.DJ_RETURN, handleDJStatusChange);
    };
  }, [dispatch, role, isConnected, countTracks, groupId]);

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
