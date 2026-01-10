import { SOCKET_EVENTS, RECONNECTION_CONFIG } from '@shared/constants';
import type { SocketEventHandlers, WebSocketServiceConfig } from '../websocket/types';
import type { AudioState, UserRole } from '@shared/types';
import { store } from '@app/store';
import { getAudioService } from '../audio/audioService';

interface SFUSignalingMessage {
  type:
    | 'join'
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'session-create'
    | 'session-join'
    | 'session-leave'
    | 'audio-event'
    | 'join-room'
    | 'leave-room'
    | 'role'
    | 'playback-state'
    | 'server-ping'
    | 'welcome'
    | 'room-users'
    | 'get-room-users'
    | 'ping'
    | 'pong'
    | 'left'
    | 'user-left'
    | 'user-joined'
    | 'close'
    | 'joined'
    | 'kicked'
    | 'member-left'
    | 'member-joined'
    | 'dj-state-change'
    | 'request-playback-state'
    | 'playback-event'
    | 'playback-state-response';
  data?: unknown;
  sessionId?: string;
  event?: string;
  payload?: unknown;
  room?: string;
  [key: string]: unknown;
}

class WebRTCSFUService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private signalingWebSocket: WebSocket | null = null;
  private config: WebSocketServiceConfig;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private isConnecting = false;
  private signalingUrl: string;
  private sessionId: string | null = null;
  private role: UserRole | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private peerId: string | null = null;

  private readonly RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  constructor(config: WebSocketServiceConfig) {
    this.config = {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: RECONNECTION_CONFIG.MAX_ATTEMPTS,
      ...config,
    };

    if (config.url.startsWith('ws://') || config.url.startsWith('wss://')) {
      this.signalingUrl = config.url.replace(/\/$/, '');
    } else {
      this.signalingUrl = config.url
        .replace(/^http:/, 'ws:')
        .replace(/^https:/, 'wss:')
        .replace(/\/$/, '');
    }

    if (!this.signalingUrl.startsWith('ws://') && !this.signalingUrl.startsWith('wss://')) {
      console.error(
        'ERROR: La URL de señalización debe ser WebSocket (ws:// o wss://), pero es:',
        this.signalingUrl
      );
      throw new Error(
        `URL de señalización inválida: debe ser WebSocket (ws:// o wss://), pero recibió: ${this.signalingUrl}`
      );
    }
  }

  async connect(): Promise<void> {
    if (this.isConnecting) {
      return;
    }

    if (
      this.dataChannel?.readyState === 'open' &&
      this.signalingWebSocket?.readyState === WebSocket.OPEN
    ) {
      console.warn('WebRTC SFU ya está conectado');
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: true });
      return;
    }

    this.isConnecting = true;

    try {
      await this.connectSignalingWebSocket();
      await this.initializePeerConnection();
      this.createDataChannel();

      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await this.peerConnection!.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: 'offer',
        data: offer,
        sessionId: this.sessionId || undefined,
      });

      this.isConnecting = false;
    } catch (error) {
      console.error('Error al conectar WebRTC SFU:', error);
      this.isConnecting = false;
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });

      if (
        this.config.reconnection &&
        this.reconnectAttempts < (this.config.reconnectionAttempts || 5)
      ) {
        this.scheduleReconnect();
      }
    }
  }

  private connectSignalingWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.signalingUrl.startsWith('ws://') && !this.signalingUrl.startsWith('wss://')) {
          const error = new Error(
            `URL de señalización debe ser WebSocket (ws:// o wss://), pero es: ${this.signalingUrl}`
          );
          console.error(error);
          reject(error);
          return;
        }

        const wsUrl = this.signalingUrl;

        this.signalingWebSocket = new WebSocket(wsUrl);

        this.signalingWebSocket.onopen = () => {
          this.reconnectAttempts = 0;
          this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: true });
          resolve();
        };

        this.signalingWebSocket.onerror = (error) => {
          console.error('Error en WebSocket de señalización:', error);
          reject(error);
        };

        this.signalingWebSocket.onclose = () => {
          this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });

          if (this.config.reconnection) {
            this.scheduleReconnect();
          }
        };

        this.signalingWebSocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as SFUSignalingMessage;
            this.handleSignalingMessage(message);
          } catch (error) {
            console.error('Error al parsear mensaje de señalización:', error);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private async handleSignalingMessage(message: SFUSignalingMessage): Promise<void> {
    // NOTE - Received message from signaling server
    switch (message.type) {
      case 'answer': {
        if (this.peerConnection && message.data) {
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(message.data as RTCSessionDescriptionInit)
          );
        }
        break;
      }

      case 'ice-candidate': {
        if (this.peerConnection && message.data) {
          try {
            await this.peerConnection.addIceCandidate(
              new RTCIceCandidate(message.data as RTCIceCandidateInit)
            );
          } catch (error) {
            console.error('Error al agregar ICE candidate:', error);
          }
        }
        break;
      }

      case 'role': {
        if (this.role === 'dj') {
          this.sessionId = 'Spotty-Fredy';
          this.handleEvent(SOCKET_EVENTS.SESSION_CREATED, { sessionId: this.sessionId });
        } else if (this.role === 'member') {
          this.handleEvent(SOCKET_EVENTS.SESSION_JOINED, { sessionId: this.sessionId });
        }
        break;
      }

      case 'playback-state': {
        const playbackState = message as {
          type: string;
          room: string;
          userName: string;
          userId?: string;
          position: number;
          isPlaying: boolean;
          timestamp: number; // Timestamp en segundos (Unix timestamp)
          trackUrl: string;
          duration?: number | null; // Duración en segundos, puede ser null
          trackTitle?: string | null;
          trackArtist?: string | null;
        };

        if (!playbackState.trackUrl) {
          console.warn('Received playback-state without trackUrl:', playbackState);
          return;
        }

        let currentAudioState: Partial<AudioState> = {};
        try {
          const state = store.getState();
          if (state.audio) {
            currentAudioState = state.audio;
          }
        } catch (error) {
          console.error('Error to get audio state:', error);
        }

        const clientReceiveTime = Date.now();
        const timestamp = clientReceiveTime;
        const trackDuration =
          playbackState.duration !== null && playbackState.duration !== undefined
            ? playbackState.duration
            : currentAudioState.trackDuration;

        const trackTitle =
          playbackState.trackTitle !== null && playbackState.trackTitle !== undefined
            ? playbackState.trackTitle
            : currentAudioState.trackTitle;

        const trackArtist =
          playbackState.trackArtist !== null && playbackState.trackArtist !== undefined
            ? playbackState.trackArtist
            : currentAudioState.trackArtist;

        const audioState: AudioState = {
          isPlaying: playbackState.isPlaying ?? false,
          currentPosition:
            isNaN(playbackState.position) || playbackState.position < 0
              ? (currentAudioState.currentPosition ?? 0)
              : playbackState.position,
          volume: currentAudioState.volume ?? 100,
          trackId: currentAudioState.trackId || playbackState.trackUrl || '',
          trackUrl: playbackState.trackUrl || currentAudioState.trackUrl || '',
          trackTitle: trackTitle,
          trackArtist: trackArtist,
          trackDuration: trackDuration,
          timestamp: timestamp,
          truckUrl: playbackState.trackUrl,
        };

        this.handleEvent(SOCKET_EVENTS.AUDIO_STATE, audioState);
        break;
      }

      case 'server-ping':
      case 'pong': {
        this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: true });
        break;
      }
      case 'user-left':
      case 'user-joined': {
        break;
      }
      case 'welcome':
        this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: true });
        break;
      case 'room-users': {
        this.handleEvent(SOCKET_EVENTS.ROOM_USERS, message);
        break;
      }
      case 'joined': {
        this.handleEvent(SOCKET_EVENTS.PARTICIPANT_JOINED, message);
        break;
      }
      case 'left': {
        this.handleEvent(SOCKET_EVENTS.PARTICIPANT_LEFT, message);
        break;
      }
      case 'member-joined': {
        this.handleEvent(SOCKET_EVENTS.MEMBER_JOINED, message);
        break;
      }
      case 'member-left': {
        this.handleEvent(SOCKET_EVENTS.MEMBER_LEFT, message);
        break;
      }
      case 'kicked': {
        this.handleEvent(SOCKET_EVENTS.KICKED, message);
        break;
      }

      case 'dj-state-change': {
        this.handleEvent(SOCKET_EVENTS.DJ_RETURN, message);
        break;
      }

      case 'request-playback-state': {
        if (this.role === 'member') {
          const audioState = store.getState().audio;
          const audioService = getAudioService();
          const audioServiceState = audioService.getState();

          if (audioServiceState && audioState.trackUrl) {
            const playbackStateResponse = {
              requestId: (message as any).requestId,
              isPlaying: audioServiceState.isPlaying || false,
              trackId: audioState.trackId || '',
              position: (audioServiceState.currentPosition || 0) * 1000, // Convertir a ms
              trackUrl: audioState.trackUrl,
              trackTitle: audioState.trackTitle || null,
              trackArtist: audioState.trackArtist || null,
              duration: audioState.trackDuration ? audioState.trackDuration * 1000 : null, // Convertir a ms
              userId: (store.getState().auth.user as any)?.id || null,
              userName: (store.getState().auth.user as any)?.name || null,
            };
            this.sendSignalingMessage({
              type: 'playback-state-response',
              data: playbackStateResponse,
            });
          }
        }
        break;
      }

      case 'playback-event': {
        // Evento de playback (play/pause) del DJ
        const playbackEvent = message as {
          type: string;
          event: 'playback-play' | 'playback-pause';
          groupId?: string;
          trackId?: string;
          position?: number;
          isPlaying?: boolean;
          trackUrl?: string;
          trackTitle?: string;
          trackArtist?: string;
          duration?: number;
        };

        if (playbackEvent.event === 'playback-play' || playbackEvent.event === 'playback-pause') {
          const audioState: AudioState = {
            isPlaying: playbackEvent.isPlaying ?? playbackEvent.event === 'playback-play',
            currentPosition:
              playbackEvent.position !== undefined
                ? playbackEvent.position / 1000
                : store.getState().audio.currentPosition || 0, // Convertir de ms a segundos
            volume: store.getState().audio.volume ?? 100,
            trackId: playbackEvent.trackId || store.getState().audio.trackId || '',
            trackUrl: playbackEvent.trackUrl || store.getState().audio.trackUrl || '',
            trackTitle: playbackEvent.trackTitle || store.getState().audio.trackTitle,
            trackArtist: playbackEvent.trackArtist || store.getState().audio.trackArtist,
            trackDuration: playbackEvent.duration
              ? playbackEvent.duration / 1000
              : store.getState().audio.trackDuration, // Convertir de ms a segundos
            timestamp: Date.now(),
          };

          this.handleEvent(SOCKET_EVENTS.AUDIO_STATE, audioState);
        }
        break;
      }

      default:
        console.warn('Tipo de mensaje de señalización desconocido:', message.type);
    }
  }

  private sendSignalingMessage(message: SFUSignalingMessage, simple = false): void {
    if (!this.signalingWebSocket || this.signalingWebSocket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket de señalización no está conectado');
      return;
    }

    try {
      const messageToSend = {
        ...message,
        role: this.role || undefined,
        peerId: this.peerId || undefined,
      };

      if (simple) {
        delete messageToSend.role;
        delete messageToSend.peerId;
      }

      this.signalingWebSocket.send(JSON.stringify(messageToSend));
    } catch (error) {
      console.error('Error al enviar mensaje de señalización:', error);
    }
  }

  private async initializePeerConnection(): Promise<void> {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(this.RTC_CONFIG);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.peerConnection?.connectionState !== 'connected') {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          data: event.candidate,
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state === 'connected') {
        this.reconnectAttempts = 0;
        this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: true });
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });

        if (this.config.reconnection && state !== 'closed') {
          this.scheduleReconnect();
        }
      }
    };

    this.peerConnection.ontrack = (_event) => {};
  }

  private createDataChannel(): void {
    if (!this.peerConnection) return;

    this.dataChannel = this.peerConnection.createDataChannel('control', {
      ordered: true,
    });

    this.dataChannel.onopen = () => {
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: true });
    };

    this.dataChannel.onclose = () => {
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });
    };

    this.dataChannel.onerror = (error) => {
      console.error('Error en data channel:', error);
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SFUSignalingMessage;
        if (message.event && message.payload) {
          this.handleEvent(message.event, message.payload);
        }
      } catch (error) {
        console.error('Error al parsear mensaje del data channel:', error);
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      RECONNECTION_CONFIG.INITIAL_DELAY *
        Math.pow(RECONNECTION_CONFIG.MULTIPLIER, this.reconnectAttempts - 1),
      RECONNECTION_CONFIG.MAX_DELAY
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Error en reconexión SFU:', error);
      });
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.signalingWebSocket) {
      this.signalingWebSocket.close();
      this.signalingWebSocket = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });
  }

  isConnected(): boolean {
    const signalingConnected = this.signalingWebSocket?.readyState === WebSocket.OPEN;
    const dataChannelOpen = this.dataChannel?.readyState === 'open';

    if (dataChannelOpen && signalingConnected) {
      return true;
    }

    return signalingConnected;
  }

  private handleEvent(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error en handler de evento ${event}:`, error);
        }
      });
    }
  }

  getRoomUsers(): void {
    this.sendSignalingMessage({ type: 'get-room-users' }, true);
  }

  ping(): void {
    this.sendSignalingMessage({ type: 'ping' }, true);
  }

  on<K extends keyof SocketEventHandlers>(event: K, handler: SocketEventHandlers[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  off<K extends keyof SocketEventHandlers>(event: K, handler: SocketEventHandlers[K]): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  emit(_event: string, data?: unknown): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(
          JSON.stringify({
            type: 'playback-state',
            ...(data as Record<string, unknown>),
          })
        );
        return;
      } catch (error) {
        console.warn('Error al enviar por data channel, intentando WebSocket:', error);
      }
    }

    this.sendSignalingMessage({
      type: 'playback-state',
      ...(data as Record<string, unknown>),
    });
  }

  async createSession(name: string, user: IUserData): Promise<void> {
    try {
      this.role = 'dj';
      this.sendSignalingMessage({
        room: name,
        userName: user.displayName,
        userId: user.id,
        type: 'join',
      });
    } catch (error) {
      console.error('Error creating session:', error);
      this.handleEvent(SOCKET_EVENTS.SESSION_ERROR, { error: 'Error creating session' });
    }
  }

  async joinSession(sessionIdToJoin: string, user: IUserData): Promise<void> {
    try {
      this.sessionId = sessionIdToJoin;
      this.role = 'member';

      this.sendSignalingMessage({
        type: 'join',
        room: sessionIdToJoin,
        userId: user.id,
        userName: user.displayName,
      });
    } catch (error) {
      console.error('Error al unirse a sesión:', error);
      this.handleEvent(SOCKET_EVENTS.SESSION_ERROR, { error: 'Error al unirse a sesión' });
    }
  }

  async leaveSession(): Promise<void> {
    try {
      this.sendSignalingMessage({
        type: 'close',
        // data: { sessionId: sessionIdToLeave },
      });

      this.sendSignalingMessage({
        type: 'left',
        // room: sessionIdToLeave,
      });
    } catch (error) {
      console.error('Error al abandonar sesión:', error);
    } finally {
      this.disconnect();
      this.sessionId = null;
      this.role = null;
    }
  }

  private emitPlaybackState(position: number, isPlaying: boolean, trackUrl: string): void {
    // const room = this.sessionId || '';
    // const userName = 'FredyMax';
    const timestamp = Date.now();
    this.emit(SOCKET_EVENTS.PLAYBACK_STATE, {
      // room,
      // userName,
      position,
      isPlaying,
      trackUrl,
      timestamp,
    });
  }

  playAudio(timestamp: number, position?: number, trackUrl?: string): void {
    this.emit(SOCKET_EVENTS.AUDIO_PLAY, {
      position: position ?? 0,
      isPlaying: true,
      trackUrl,
      timestamp,
    });
  }

  pauseAudio(timestamp: number, position?: number, trackUrl?: string): void {
    this.emit(SOCKET_EVENTS.AUDIO_PAUSE, {
      position: position ?? 0,
      isPlaying: false,
      trackUrl,
      timestamp,
    });
  }

  seekAudio(position: number, _timestamp: number, trackUrl?: string, isPlaying?: boolean): void {
    if (trackUrl) {
      this.emitPlaybackState(position, isPlaying ?? true, trackUrl);
    }
  }

  setVolume(volume: number): void {
    this.emit(SOCKET_EVENTS.AUDIO_VOLUME, { volume });
  }

  nextTrack(timestamp: number): void {
    this.emit(SOCKET_EVENTS.AUDIO_NEXT, { timestamp });
  }

  requestSync(sessionId: string): void {
    this.emit(SOCKET_EVENTS.SYNC_REQUEST, { sessionId });
  }

  getSocketId(): string | undefined {
    return this.peerId || this.sessionId || undefined;
  }
}

let instance: WebRTCSFUService | null = null;

export function getWebRTCSFUService(config?: WebSocketServiceConfig): WebRTCSFUService {
  if (!instance) {
    if (!config) {
      throw new Error('WebRTCSFUService debe ser inicializado con configuración');
    }
    instance = new WebRTCSFUService(config);
  }
  return instance;
}

export function initializeWebRTCSFUService(config: WebSocketServiceConfig): WebRTCSFUService {
  if (instance) {
    console.warn('WebRTCSFUService ya está inicializado');
    return instance;
  }
  instance = new WebRTCSFUService(config);
  return instance;
}

export default WebRTCSFUService;
