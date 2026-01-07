/**
 * Servicio de WebRTC usando Data Channels
 * Maneja toda la comunicación en tiempo real con el servidor de señalización
 */

import { SOCKET_EVENTS, RECONNECTION_CONFIG } from '@shared/constants';
import type { SocketEventHandlers, WebSocketServiceConfig } from '../websocket/types';
import { UserRole } from '@/shared/types';

interface SignalingMessage {
  type:
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'session-create'
    | 'session-join'
    | 'session-leave'
    | 'audio-event';
  data?: unknown;
  sessionId?: string;
  event?: string;
  payload?: unknown;
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private config: WebSocketServiceConfig;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private isConnecting = false;
  private signalingUrl: string;
  private sessionId: string | null = null;
  private role: UserRole | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  // STUN servers para NAT traversal
  private readonly RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Puedes agregar más STUN/TURN servers aquí si es necesario
    ],
  };

  constructor(config: WebSocketServiceConfig) {
    this.config = {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: RECONNECTION_CONFIG.MAX_ATTEMPTS,
      ...config,
    };

    // IMPORTANTE: Si la URL es WebSocket (ws:// o wss://), NO usar este servicio
    // Este servicio usa fetch() que no funciona con WebSocket
    if (config.url.startsWith('ws://') || config.url.startsWith('wss://')) {
      throw new Error(
        `WebRTCService (P2P) no puede usar URLs WebSocket. ` +
          `Usa WebRTCSFUService o configura VITE_USE_SFU=true. ` +
          `URL recibida: ${config.url}`
      );
    }

    // El signaling server debería estar en la misma URL base pero con endpoint diferente
    this.signalingUrl = config.url.replace(/\/$/, '');
  }

  /**
   * Conecta al servidor de señalización y establece conexión WebRTC
   */
  async connect(): Promise<void> {
    if (this.isConnecting) {
      console.warn('WebRTC ya se está conectando');
      return;
    }

    if (this.dataChannel?.readyState === 'open') {
      console.warn('WebRTC ya está conectado');
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: true });
      return;
    }

    this.isConnecting = true;

    try {
      // Inicializar conexión peer-to-peer
      await this.initializePeerConnection();

      // Crear data channel
      this.createDataChannel();

      // Crear offer y enviarlo al servidor de señalización
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);

      // Enviar offer al servidor de señalización
      const response = await this.sendSignalingMessage({
        type: 'offer',
        data: offer,
      });

      if (response && response.type === 'answer') {
        await this.peerConnection!.setRemoteDescription(
          new RTCSessionDescription(response.data as RTCSessionDescriptionInit)
        );
      }

      this.isConnecting = false;
    } catch (error) {
      console.error('Error al conectar WebRTC:', error);
      this.isConnecting = false;
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });

      // Intentar reconexión si está habilitada
      if (
        this.config.reconnection &&
        this.reconnectAttempts < (this.config.reconnectionAttempts || 5)
      ) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Inicializa la conexión peer-to-peer
   */
  private async initializePeerConnection(): Promise<void> {
    // Limpiar conexión anterior si existe
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(this.RTC_CONFIG);

    // Manejar ICE candidates
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          await this.sendSignalingMessage({
            type: 'ice-candidate',
            data: event.candidate,
          });
        } catch (error) {
          console.error('Error al enviar ICE candidate:', error);
        }
      }
    };

    // Manejar cambios en el estado de conexión
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

    // Manejar ICE candidates recibidos del servidor
    // Esto se manejará a través del servidor de señalización
  }

  /**
   * Crea el data channel para comunicación de datos
   */
  private createDataChannel(): void {
    if (!this.peerConnection) return;

    // Crear data channel con configuración confiable
    this.dataChannel = this.peerConnection.createDataChannel('messages', {
      ordered: true, // Mensajes en orden
    });

    this.dataChannel.onopen = () => {
      this.reconnectAttempts = 0;
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: true });
    };

    this.dataChannel.onclose = () => {
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });

      if (this.config.reconnection) {
        this.scheduleReconnect();
      }
    };

    this.dataChannel.onerror = (error) => {
      console.error('Error en data channel:', error);
      this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SignalingMessage;
        this.handleDataChannelMessage(message);
      } catch (error) {
        console.error('Error al parsear mensaje del data channel:', error);
      }
    };
  }

  /**
   * Maneja mensajes recibidos a través del data channel
   */
  private handleDataChannelMessage(message: SignalingMessage): void {
    // Si es un evento de audio o sesión, dispararlo a los handlers
    if (message.event && message.payload) {
      this.handleEvent(message.event, message.payload);
    }
  }

  /**
   * Envía un mensaje al servidor de señalización
   */
  private async sendSignalingMessage(message: SignalingMessage): Promise<SignalingMessage | null> {
    try {
      const response = await fetch(`${this.signalingUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...message,
          sessionId: this.sessionId,
          role: this.role,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error al enviar mensaje de señalización:', error);
      throw error;
    }
  }

  /**
   * Programa una reconexión
   */
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
        console.error('Error en reconexión:', error);
      });
    }, delay);
  }

  /**
   * Desconecta del servidor
   */
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

    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.dataChannel?.readyState === 'open' || false;
  }

  /**
   * Maneja eventos recibidos
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
   * Emite un evento al servidor a través del data channel
   */
  emit(event: string, data?: unknown): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn(`No se puede emitir evento ${event}: data channel no conectado`);
      return;
    }

    try {
      const message: SignalingMessage = {
        type: 'audio-event',
        event,
        payload: data,
        sessionId: this.sessionId || undefined,
      };

      this.dataChannel.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error al emitir evento ${event}:`, error);
    }
  }

  async createSession(name?: string): Promise<void> {
    try {
      const response = await this.sendSignalingMessage({
        type: 'session-create',
        data: { name },
      });

      if (response && response.data) {
        const sessionData = response.data as { sessionId: string };
        this.sessionId = sessionData.sessionId;
        this.role = 'dj';

        // Conectar después de crear la sesión
        await this.connect();

        this.handleEvent(SOCKET_EVENTS.SESSION_CREATED, { sessionId: sessionData.sessionId });
      }
    } catch (error) {
      console.error('Error al crear sesión:', error);
      this.handleEvent(SOCKET_EVENTS.SESSION_ERROR, { error: 'Error al crear sesión' });
    }
  }

  async joinSession(sessionIdToJoin: string): Promise<void> {
    try {
      this.sessionId = sessionIdToJoin;
      this.role = 'member';

      const response = await this.sendSignalingMessage({
        type: 'session-join',
        data: { sessionId: sessionIdToJoin },
      });

      if (response && response.data) {
        // Conectar después de unirse a la sesión
        await this.connect();

        this.handleEvent(SOCKET_EVENTS.SESSION_JOINED, response.data as any);
      }
    } catch (error) {
      console.error('Error al unirse a sesión:', error);
      this.handleEvent(SOCKET_EVENTS.SESSION_ERROR, { error: 'Error al unirse a sesión' });
    }
  }

  async leaveSession(sessionIdToLeave: string): Promise<void> {
    try {
      await this.sendSignalingMessage({
        type: 'session-leave',
        data: { sessionId: sessionIdToLeave },
      });
    } catch (error) {
      console.error('Error al abandonar sesión:', error);
    } finally {
      this.disconnect();
      this.sessionId = null;
      this.role = null;
    }
  }

  playAudio(timestamp: number, position?: number, trackUrl?: string): void {
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
        truckUrl: trackUrl,
      });
    }
  }

  pauseAudio(timestamp: number, position?: number, trackUrl?: string): void {
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
        truckUrl: trackUrl,
      });
    }
  }

  seekAudio(position: number, timestamp: number, trackUrl?: string, isPlaying?: boolean): void {
    // Mantener compatibilidad con el evento antiguo
    this.emit(SOCKET_EVENTS.AUDIO_SEEK, { position, timestamp });

    // Emitir nuevo evento playback-state si se proporciona trackUrl
    if (trackUrl) {
      const sessionId = this.getSocketId() || '';
      this.emit(SOCKET_EVENTS.PLAYBACK_STATE, {
        room: sessionId,
        userName: 'User', // TODO: obtener del estado de sesión
        position,
        isPlaying: isPlaying ?? true,
        truckUrl: trackUrl,
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

  /**
   * Obtiene el ID del peer (si está disponible)
   */
  getSocketId(): string | undefined {
    // En WebRTC no hay un "socket ID" como en Socket.IO
    // Podríamos usar el sessionId o generar un ID único
    return this.sessionId || undefined;
  }
}

// Singleton instance
let instance: WebRTCService | null = null;

export function getWebRTCService(config?: WebSocketServiceConfig): WebRTCService {
  if (!instance) {
    if (!config) {
      throw new Error('WebRTCService debe ser inicializado con configuración');
    }
    instance = new WebRTCService(config);
  }
  return instance;
}

export function initializeWebRTCService(config: WebSocketServiceConfig): WebRTCService {
  if (instance) {
    console.warn('WebRTCService ya está inicializado');
    return instance;
  }
  instance = new WebRTCService(config);
  return instance;
}

export default WebRTCService;
