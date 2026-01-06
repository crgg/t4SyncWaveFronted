/**
 * Tipos para el servicio de WebSocket
 */

import type { IRoomUsers, IRoomUser } from '@/features/groups/groups.types';
import { AudioState, SessionInfo, Track } from '@shared/types';
import { SOCKET_EVENTS } from '@shared/constants';

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export interface SocketEventHandlers {
  [SOCKET_EVENTS.SESSION_CREATED]: (data: { sessionId: string }) => void;
  [SOCKET_EVENTS.SESSION_JOINED]: (data: SessionInfo) => void;
  [SOCKET_EVENTS.SESSION_ERROR]: (data: { error: string }) => void;
  [SOCKET_EVENTS.AUDIO_STATE]: (data: AudioState) => void;
  [SOCKET_EVENTS.AUDIO_SYNC]: (data: { position: number; timestamp: number }) => void;
  [SOCKET_EVENTS.CONNECTION_STATUS]: (data: { connected: boolean }) => void;
  [SOCKET_EVENTS.PARTICIPANT_JOINED]: (data: IRoomUser) => void;
  [SOCKET_EVENTS.PARTICIPANT_LEFT]: (data: IRoomUser) => void;
  [SOCKET_EVENTS.MEMBER_JOINED]: (data: {
    type: string;
    room: string;
    member: {
      userId: string;
      name: string;
      email: string;
      avatar_url?: string | null;
      role: string;
    };
  }) => void;
  [SOCKET_EVENTS.MEMBER_LEFT]: (data: {
    type: string;
    room: string;
    member: {
      userId: string;
      name: string;
      reason?: string;
    };
  }) => void;
  [SOCKET_EVENTS.KICKED]: (data: { reason: string }) => void;
  [SOCKET_EVENTS.PLAYLIST_SYNC]: (data: {
    tracks: Track[];
    currentTrackIndex: number | null;
  }) => void;
  [SOCKET_EVENTS.PLAYBACK_STATE]: (data: {
    room: string;
    userName: string;
    position: number;
    isPlaying: boolean;
    trackUrl: string;
  }) => void;
  [SOCKET_EVENTS.ROOM_USERS]: (data: IRoomUsers) => void;
  [SOCKET_EVENTS.PLAYBACK_EVENT]: (data: {
    event: 'playback-play' | 'playback-pause';
    groupId?: string;
    trackId?: string;
    position?: number;
    isPlaying?: boolean;
    trackUrl?: string;
    trackTitle?: string;
    trackArtist?: string;
    duration?: number;
  }) => void;
  [SOCKET_EVENTS.REQUEST_PLAYBACK_STATE]: (data: {
    requestId: string;
    groupId?: string;
  }) => void;
  [SOCKET_EVENTS.DJ_RETURN]: (data: {
    userId?: string;
    groupId?: string;
    state?: string;
  }) => void;
}

export interface WebSocketServiceConfig {
  url: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
}
