/**
 * Servicio de WebSocket usando Socket.IO
 * Maneja toda la comunicación en tiempo real con el servidor
 *
 * NOTA: Este servicio ahora puede usar WebRTC en lugar de Socket.IO
 * Para usar WebRTC, configura VITE_USE_WEBRTC=true en el .env
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, RECONNECTION_CONFIG } from '@shared/constants';
import type { SocketEventHandlers, WebSocketServiceConfig } from './types';

// Importar WebRTC service si está habilitado
const USE_WEBRTC = import.meta.env.VITE_USE_WEBRTC === 'true';
const USE_SFU = import.meta.env.VITE_USE_SFU === 'true'; // SFU mode

// Función helper para detectar si la URL es WebSocket (auto-detectar SFU)
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

  /**
   * Conecta al servidor WebSocket o WebRTC
   */
  async connect(): Promise<void> {
    const urlIsWebSocket = isWebSocketUrl(this.config.url);
    const shouldUseSFU = this.useSFU || (this.useWebRTC && urlIsWebSocket);
    if (this.useWebRTC) {
      if (shouldUseSFU) {
        console.log('Usando modo WebRTC SFU (detectado automáticamente por URL WebSocket)');
        return this.connectWebRTCSFU();
      }
      console.log('Usando modo WebRTC P2P');
      return this.connectWebRTC();
    }
    console.log('Usando modo Socket.IO');
    return this.connectSocketIO();
  }

  /**
   * Conecta usando WebRTC SFU
   */
  private async connectWebRTCSFU(): Promise<void> {
    const { getWebRTCSFUService, initializeWebRTCSFUService } =
      await import('../webrtc/webrtcSFUService');
    try {
      this.webrtcSFUService = getWebRTCSFUService(this.config);
    } catch {
      this.webrtcSFUService = initializeWebRTCSFUService(this.config);
    }

    // Copiar event handlers al servicio WebRTC SFU
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.webrtcSFUService!.on(event as any, handler as any);
      });
    });

    await this.webrtcSFUService.connect();
  }

  /**
   * Conecta usando WebRTC (peer-to-peer)
   */
  private async connectWebRTC(): Promise<void> {
    if (!this.webrtcService) {
      const { getWebRTCService, initializeWebRTCService } = await import('../webrtc/webrtcService');
      try {
        this.webrtcService = getWebRTCService(this.config);
      } catch {
        this.webrtcService = initializeWebRTCService(this.config);
      }
    }

    // Copiar event handlers al servicio WebRTC
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.webrtcService!.on(event as any, handler as any);
      });
    });

    await this.webrtcService.connect();
  }

  /**
   * Conecta usando Socket.IO
   */
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

    // Si ya existe un socket pero no está conectado, limpiarlo primero
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
      transports: ['websocket', 'polling'], // Permitir ambos transportes
      upgrade: true,
      rememberUpgrade: true,
      withCredentials: false, // No enviar credenciales para evitar problemas CORS
    });

    this.setupEventListeners();

    // Resetear flag de conexión cuando se conecta o falla
    const resetConnectingFlag = () => {
      this.isConnecting = false;
    };

    this.socket.once('connect', resetConnectingFlag);
    this.socket.once('connect_error', resetConnectingFlag);
    this.socket.once('disconnect', resetConnectingFlag);

    this.socket.connect();
  }

  /**
   * Desconecta del servidor WebSocket o WebRTC
   */
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

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        return this.webrtcSFUService.isConnected();
      }
      if (this.webrtcService) {
        console.log('Debugger isConnected - webrtcService');
        return this.webrtcService.isConnected();
      }
    }
    return this.socket?.connected ?? false;
  }

  /**
   * Configura los listeners de eventos del socket
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket conectado');
      this.reconnectAttempts = 0;
      this.isConnecting = false; // Resetear flag cuando se conecta
      // Disparar handlers locales directamente
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket desconectado:', reason);
      // Disparar handlers locales directamente
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión WebSocket:', error);
      this.isConnecting = false; // Resetear flag cuando hay error

      // Verificar propiedades del error de forma segura
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

      // Verificar si es un error de CORS
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
      // Disparar handlers locales directamente
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });
    });

    // Registrar handlers para eventos específicos
    Object.values(SOCKET_EVENTS).forEach((event) => {
      this.socket?.on(event, (data) => {
        this.handleEvent(event, data);
      });
    });
  }

  /**
   * Maneja eventos recibidos del servidor
   */
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

  /**
   * Registra un handler para un evento específico
   */
  on<K extends keyof SocketEventHandlers>(event: K, handler: SocketEventHandlers[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  /**
   * Elimina un handler de evento
   */
  off<K extends keyof SocketEventHandlers>(event: K, handler: SocketEventHandlers[K]): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Emite un evento al servidor
   */
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

  /**
   * Crea una nueva sesión (solo host)
   */
  async createSession(name?: string): Promise<void> {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        await this.webrtcSFUService.createSession(name);
        return;
      }
      if (this.webrtcService) {
        await this.webrtcService.createSession(name);
        return;
      }
    }
    this.emit(SOCKET_EVENTS.SESSION_CREATE, { name });
  }

  /**
   * Se une a una sesión existente
   */
  async joinSession(sessionId: string): Promise<void> {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        await this.webrtcSFUService.joinSession(sessionId);
        return;
      }
      if (this.webrtcService) {
        await this.webrtcService.joinSession(sessionId);
        return;
      }
    }
    this.emit(SOCKET_EVENTS.SESSION_JOIN, { sessionId });
  }

  /**
   * Abandona la sesión actual
   */
  async leaveSession(sessionId: string): Promise<void> {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        await this.webrtcSFUService.leaveSession(sessionId);
        return;
      }
      if (this.webrtcService) {
        await this.webrtcService.leaveSession(sessionId);
        return;
      }
    }
    this.emit(SOCKET_EVENTS.SESSION_LEAVE, { sessionId });
  }

  /**
   * Reproduce el audio (solo host)
   */
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

    // Mantener compatibilidad con el evento antiguo
    this.emit(SOCKET_EVENTS.AUDIO_PLAY, { timestamp });

    // Emitir nuevo evento playback-state si se proporcionan los parámetros
    if (position !== undefined && trackUrl) {
      const sessionId = this.getSocketId() || '';
      this.emit(SOCKET_EVENTS.PLAYBACK_STATE, {
        room: sessionId,
        userName: 'User', // TODO: obtener del estado de sesión
        position,
        isPlaying: true,
        trackUrl,
      });
    }
  }

  /**
   * Pausa el audio (solo host)
   */
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

    // Mantener compatibilidad con el evento antiguo
    this.emit(SOCKET_EVENTS.AUDIO_PAUSE, { timestamp });

    // Emitir nuevo evento playback-state si se proporcionan los parámetros
    if (position !== undefined && trackUrl) {
      const sessionId = this.getSocketId() || '';
      this.emit(SOCKET_EVENTS.PLAYBACK_STATE, {
        room: sessionId,
        userName: 'User', // TODO: obtener del estado de sesión
        position,
        isPlaying: false,
        trackUrl,
      });
    }
  }

  /**
   * Cambia la posición del audio (solo host)
   */
  seekAudio(position: number, timestamp: number, trackUrl?: string): void {
    if (this.useWebRTC) {
      if (this.useSFU && this.webrtcSFUService) {
        this.webrtcSFUService.seekAudio(position, timestamp, trackUrl);
        return;
      }
      if (this.webrtcService) {
        this.webrtcService.seekAudio(position, timestamp, trackUrl);
        return;
      }
    }

    // Mantener compatibilidad con el evento antiguo
    this.emit(SOCKET_EVENTS.AUDIO_SEEK, { position, timestamp });

    // Emitir nuevo evento playback-state si se proporciona trackUrl
    if (trackUrl) {
      const sessionId = this.getSocketId() || '';
      this.emit(SOCKET_EVENTS.PLAYBACK_STATE, {
        room: sessionId,
        userName: 'User', // TODO: obtener del estado de sesión
        position,
        isPlaying: true, // Asumimos que sigue reproduciendo después de seek
        trackUrl,
      });
    }
  }

  /**
   * Cambia el volumen (solo host)
   */
  setVolume(volume: number): void {
    this.emit(SOCKET_EVENTS.AUDIO_VOLUME, { volume });
  }

  /**
   * Siguiente canción (solo host)
   */
  nextTrack(timestamp: number): void {
    this.emit(SOCKET_EVENTS.AUDIO_NEXT, { timestamp });
  }

  /**
   * Solicita sincronización (solo listener)
   */
  requestSync(sessionId: string): void {
    this.emit(SOCKET_EVENTS.SYNC_REQUEST, { sessionId });
  }

  /**
   * Obtiene el ID del socket o peer
   */
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
}

// Singleton instance
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
