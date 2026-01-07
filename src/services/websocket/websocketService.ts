import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, RECONNECTION_CONFIG } from '@shared/constants';
import type { SocketEventHandlers, WebSocketServiceConfig } from './types';

const USE_WEBRTC = import.meta.env.VITE_USE_WEBRTC === 'true';
const USE_SFU = import.meta.env.VITE_USE_WEBRTC === 'true';

function isWebSocketUrl(url: string): boolean {
  return url.startsWith('ws://') || url.startsWith('wss://');
}

class WebSocketService {
  private socket: Socket | null = null;
  private webrtcService: Awaited<
    ReturnType<typeof import('../webrtc/webrtcService').getWebRTCService>
  > | null = null;
  private webrtcSFUService: Awaited<
    ReturnType<typeof import('../webrtc/webrtcSFUService').getWebRTCSFUService>
  > | null = null;
  private config: WebSocketServiceConfig;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private useWebRTC = USE_WEBRTC;
  private useSFU = USE_SFU;

  constructor(config: WebSocketServiceConfig) {
    this.config = {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: RECONNECTION_CONFIG.MAX_ATTEMPTS,
      ...config,
    };
  }

  private isConnecting = false;

  async connect(): Promise<void> {
    const urlIsWebSocket = isWebSocketUrl(this.config.url);
    const shouldUseSFU = this.useSFU || (this.useWebRTC && urlIsWebSocket);
    if (this.useWebRTC) {
      if (shouldUseSFU) {
        return this.connectWebRTCSFU();
      }
      return this.connectWebRTC();
    }
    return this.connectSocketIO();
  }

  private async connectWebRTCSFU(): Promise<void> {
    const { getWebRTCSFUService, initializeWebRTCSFUService } =
      await import('../webrtc/webrtcSFUService');
    try {
      this.webrtcSFUService = getWebRTCSFUService(this.config);
    } catch {
      this.webrtcSFUService = initializeWebRTCSFUService(this.config);
    }

    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.webrtcSFUService!.on(event as any, handler as any);
      });
    });

    await this.webrtcSFUService.connect();
  }

  private async connectWebRTC(): Promise<void> {
    if (!this.webrtcService) {
      const { getWebRTCService, initializeWebRTCService } = await import('../webrtc/webrtcService');
      try {
        this.webrtcService = getWebRTCService(this.config);
      } catch {
        this.webrtcService = initializeWebRTCService(this.config);
      }
    }

    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.webrtcService!.on(event as any, handler as any);
      });
    });

    await this.webrtcService.connect();
  }

  private connectSocketIO(): void {
    if (this.socket?.connected) {
      console.warn('WebSocket ya está conectado');
      return;
    }

    if (this.isConnecting) {
      console.warn('WebSocket ya se está conectando');
      return;
    }

    this.isConnecting = true;

    if (this.socket && !this.socket.connected) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(this.config.url, {
      autoConnect: this.config.autoConnect ?? false,
      reconnection: this.config.reconnection ?? true,
      reconnectionAttempts: this.config.reconnectionAttempts ?? RECONNECTION_CONFIG.MAX_ATTEMPTS,
      reconnectionDelay: RECONNECTION_CONFIG.INITIAL_DELAY,
      reconnectionDelayMax: RECONNECTION_CONFIG.MAX_DELAY,
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      withCredentials: false,
    });

    this.setupEventListeners();

    const resetConnectingFlag = () => {
      this.isConnecting = false;
    };

    this.socket.once('connect', resetConnectingFlag);
    this.socket.once('connect_error', resetConnectingFlag);
    this.socket.once('disconnect', resetConnectingFlag);

    this.socket.connect();
  }

  disconnect(): void {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        this.webrtcSFUService.disconnect();
        this.webrtcSFUService = null;
        this.reconnectAttempts = 0;
        return;
      }
      if (this.webrtcService) {
        this.webrtcService.disconnect();
        this.webrtcService = null;
        this.reconnectAttempts = 0;
        return;
      }
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }

  isConnected(): boolean {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        return this.webrtcSFUService.isConnected();
      }
      if (this.webrtcService) {
        return this.webrtcService.isConnected();
      }
    }
    return this.socket?.connected ?? false;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: true });
    });

    this.socket.on('disconnect', (_reason) => {
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión WebSocket:', error);
      this.isConnecting = false;

      const errorDetails: Record<string, unknown> = {
        message: error.message,
      };

      if ('type' in error) {
        errorDetails.type = (error as { type?: string }).type;
      }
      if ('description' in error) {
        errorDetails.description = (error as { description?: string }).description;
      }

      console.error('Detalles del error:', errorDetails);

      if (
        error.message?.includes('CORS') ||
        error.message?.includes('cross-origin') ||
        error.message?.includes('Access-Control')
      ) {
        console.error(
          'Error de CORS detectado. Verifica que el servidor esté configurado correctamente.'
        );
        console.error(`URL del servidor: ${this.config.url}`);
      }

      this.reconnectAttempts++;
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });
    });

    this.socket.on('pong', () => {
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: true });
    });

    this.socket.on('server-ping', () => {
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: true });
    });

    Object.values(SOCKET_EVENTS).forEach((event) => {
      this.socket?.on(event, (data) => {
        this.handleEvent(event, data);
      });
    });
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

  on<K extends keyof SocketEventHandlers>(event: K, handler: SocketEventHandlers[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  off<K extends keyof SocketEventHandlers>(event: K, handler: SocketEventHandlers[K]): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  emit(event: string, data?: unknown): void {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        this.webrtcSFUService.emit(event, data);
        return;
      }
      if (this.webrtcService) {
        this.webrtcService.emit(event, data);
        return;
      }
    }

    if (!this.socket?.connected) {
      console.warn(`No se puede emitir evento ${event}: socket no conectado`);
      return;
    }

    this.socket.emit(event, data);
  }

  async createSession(name: string, user: IUserData): Promise<void> {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        await this.webrtcSFUService.createSession(name, user);
        return;
      }
      if (this.webrtcService) {
        await this.webrtcService.createSession(name);
        return;
      }
    }
    this.emit(SOCKET_EVENTS.SESSION_CREATE, { name });
  }

  async joinSession(sessionId: string, user: IUserData): Promise<void> {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        await this.webrtcSFUService.joinSession(sessionId, user);
        return;
      }
      if (this.webrtcService) {
        await this.webrtcService.joinSession(sessionId);
        return;
      }
    }
    this.emit(SOCKET_EVENTS.SESSION_JOIN, { sessionId });
  }

  async getRoomUsers(): Promise<void> {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        this.webrtcSFUService.getRoomUsers();
        return;
      }
    }
  }

  async leaveSession(): Promise<void> {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        await this.webrtcSFUService.leaveSession();
        return;
      }
      if (this.webrtcService) {
        // await this.webrtcService.leaveSession(sessionId);
        return;
      }
    }
    // this.emit(SOCKET_EVENTS.SESSION_LEAVE, { sessionId });
  }

  playAudio(timestamp: number, position?: number, trackUrl?: string): void {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        this.webrtcSFUService.playAudio(timestamp, position, trackUrl);
        return;
      }
      if (this.webrtcService) {
        this.webrtcService.playAudio(timestamp, position, trackUrl);
        return;
      }
    }

    this.emit(SOCKET_EVENTS.AUDIO_PLAY, { timestamp });

    if (position !== undefined && trackUrl) {
      const sessionId = this.getSocketId() || '';
      this.emit(SOCKET_EVENTS.PLAYBACK_STATE, {
        room: sessionId,
        userName: 'User',
        position,
        isPlaying: true,
        trackUrl,
      });
    }
  }

  pauseAudio(timestamp: number, position?: number, trackUrl?: string): void {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        this.webrtcSFUService.pauseAudio(timestamp, position, trackUrl);
        return;
      }
      if (this.webrtcService) {
        this.webrtcService.pauseAudio(timestamp, position, trackUrl);
        return;
      }
    }

    this.emit(SOCKET_EVENTS.AUDIO_PAUSE, { timestamp });

    if (position !== undefined && trackUrl) {
      const sessionId = this.getSocketId() || '';
      this.emit(SOCKET_EVENTS.PLAYBACK_STATE, {
        room: sessionId,
        userName: 'User',
        position,
        isPlaying: false,
        trackUrl,
      });
    }
  }

  seekAudio(position: number, timestamp: number, trackUrl?: string, isPlaying?: boolean): void {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        this.webrtcSFUService.seekAudio(position, timestamp, trackUrl, isPlaying);
        return;
      }
      if (this.webrtcService) {
        this.webrtcService.seekAudio(position, timestamp, trackUrl, isPlaying);
        return;
      }
    }

    this.emit(SOCKET_EVENTS.AUDIO_SEEK, { position, timestamp });

    if (trackUrl) {
      const sessionId = this.getSocketId() || '';
      this.emit(SOCKET_EVENTS.PLAYBACK_STATE, {
        room: sessionId,
        userName: 'User',
        position,
        isPlaying: isPlaying ?? true,
        trackUrl,
      });
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
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        return this.webrtcSFUService.getSocketId();
      }
      if (this.webrtcService) {
        return this.webrtcService.getSocketId();
      }
    }
    return this.socket?.id;
  }

  ping(): void {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        this.webrtcSFUService.ping();
        return;
      }
    }
  }
}

let instance: WebSocketService | null = null;

export function getWebSocketService(config?: WebSocketServiceConfig): WebSocketService {
  if (!instance) {
    if (!config) {
      throw new Error('WebSocketService debe ser inicializado con configuración');
    }
    instance = new WebSocketService(config);
  }
  return instance;
}

export function initializeWebSocketService(config: WebSocketServiceConfig): WebSocketService {
  if (instance) {
    console.warn('WebSocketService ya está inicializado');
    return instance;
  }
  instance = new WebSocketService(config);
  return instance;
}

export default WebSocketService;
