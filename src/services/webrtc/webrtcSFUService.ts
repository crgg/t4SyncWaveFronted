/**
 * Servicio de WebRTC para SFU (Selective Forwarding Unit)
 *
 * En un SFU, todos los clientes se conectan al servidor SFU,
 * no entre ellos directamente. El SFU reenvía los streams/media.
 */

import { SOCKET_EVENTS, RECONNECTION_CONFIG } from '@shared/constants';
import type { SocketEventHandlers, WebSocketServiceConfig } from '../websocket/types';
import type { AudioState } from '@shared/types';
import { store } from '@app/store';

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
    | 'playback-state';
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
  private role: 'host' | 'listener' | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private peerId: string | null = null;

  // STUN/TURN servers para NAT traversal
  private readonly RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Agregar TURN servers si están disponibles
      // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
    ],
  };

  constructor(config: WebSocketServiceConfig) {
    this.config = {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: RECONNECTION_CONFIG.MAX_ATTEMPTS,
      ...config,
    };

    // El SFU normalmente usa WebSocket para señalización
    // IMPORTANTE: Si la URL ya es ws:// o wss://, mantenerla así
    // NO convertir wss:// a https:// (eso causaría errores de CORS con fetch)
    if (config.url.startsWith('ws://') || config.url.startsWith('wss://')) {
      this.signalingUrl = config.url.replace(/\/$/, '');
    } else {
      // Convertir http:// a ws:// o https:// a wss:// solo si no es ya WebSocket
      this.signalingUrl = config.url
        .replace(/^http:/, 'ws:')
        .replace(/^https:/, 'wss:')
        .replace(/\/$/, '');
    }

    // Validar que la URL final sea WebSocket
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

  /**
   * Conecta al servidor SFU
   */
  async connect(): Promise<void> {
    if (this.isConnecting) {
      console.warn('WebRTC SFU ya se está conectando');
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
      // 1. Conectar WebSocket para señalización
      await this.connectSignalingWebSocket();

      // 2. Inicializar conexión peer-to-SFU
      await this.initializePeerConnection();

      // 3. Crear data channel para mensajes de control
      this.createDataChannel();

      // 4. Crear offer y enviarlo al SFU
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false, // Solo audio para esta aplicación
      });
      await this.peerConnection!.setLocalDescription(offer);

      // 5. Enviar offer al SFU a través del WebSocket de señalización
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

  /**
   * Conecta el WebSocket de señalización
   */
  private connectSignalingWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // IMPORTANTE: Validar que la URL sea WebSocket antes de usarla
        if (!this.signalingUrl.startsWith('ws://') && !this.signalingUrl.startsWith('wss://')) {
          const error = new Error(
            `URL de señalización debe ser WebSocket (ws:// o wss://), pero es: ${this.signalingUrl}`
          );
          console.error(error);
          reject(error);
          return;
        }

        // Usar la URL directamente - el usuario ya proporciona la URL completa del SFU
        // Ejemplo: wss://t4videocall.t4ever.com/sfu/ws
        const wsUrl = this.signalingUrl;

        this.signalingWebSocket = new WebSocket(wsUrl);

        this.signalingWebSocket.onopen = () => {
          this.reconnectAttempts = 0;
          // Disparar evento de conexión cuando el WebSocket se conecta
          // El evento se disparará nuevamente cuando el data channel se abra
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

  /**
   * Maneja mensajes de señalización del SFU
   */
  private async handleSignalingMessage(message: SFUSignalingMessage): Promise<void> {
    console.log('debugger handleSignalingMessage', message);
    switch (message.type) {
      case 'answer': {
        // El SFU responde con un answer
        if (this.peerConnection && message.data) {
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(message.data as RTCSessionDescriptionInit)
          );
        }
        break;
      }

      case 'ice-candidate': {
        // El SFU envía un ICE candidate
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
        if (this.role === 'host') {
          this.sessionId = 'Spotty-Fredy';
          this.handleEvent(SOCKET_EVENTS.SESSION_CREATED, { sessionId: this.sessionId });
        } else if (this.role === 'listener') {
          this.handleEvent(SOCKET_EVENTS.SESSION_JOINED, { sessionId: this.sessionId });
        }
        break;
      }

      case 'playback-state': {
        // El payload viene en formato playback-state, necesitamos transformarlo a AudioState
        const playbackState = message as {
          type: string;
          room: string;
          userName: string;
          position: number;
          isPlaying: boolean;
          timestamp: number;
          truckUrl: string;
        };

        // Validar que truckUrl exista
        if (!playbackState.truckUrl) {
          console.warn('Received playback-state without truckUrl:', playbackState);
          return;
        }

        console.log('Received Playback State', playbackState);

        // Obtener el estado actual de audio desde el store si está disponible
        // Para preservar campos que no vienen en el payload
        let currentAudioState: Partial<AudioState> = {};
        try {
          const state = store.getState();
          if (state.audio) {
            currentAudioState = state.audio;
          }
        } catch (error) {
          // Si no podemos acceder al store, continuamos con valores por defecto
          console.debug('No se pudo acceder al estado de audio actual:', error);
        }

        // Transformar el payload playback-state al formato AudioState
        const audioState: AudioState = {
          isPlaying: playbackState.isPlaying ?? false,
          currentPosition:
            isNaN(playbackState.position) || playbackState.position < 0
              ? (currentAudioState.currentPosition ?? 0)
              : playbackState.position,
          volume: currentAudioState.volume ?? 100, // Preservar volumen local
          trackId: currentAudioState.trackId || '', // Preservar trackId si existe
          trackUrl: playbackState.truckUrl || currentAudioState.trackUrl || '', // Mapear truckUrl a trackUrl
          trackTitle: currentAudioState.trackTitle,
          trackArtist: currentAudioState.trackArtist,
          trackDuration: currentAudioState.trackDuration,
          timestamp: playbackState.timestamp ?? Date.now(),
          truckUrl: playbackState.truckUrl, // También preservar truckUrl original
        };

        this.handleEvent(SOCKET_EVENTS.AUDIO_STATE, audioState);
        break;
      }

      // case 'session-created': {
      //   // Sesión creada
      //   if (message.data && typeof message.data === 'object' && 'sessionId' in message.data) {
      //     this.sessionId = (message.data as { sessionId: string }).sessionId;
      //     this.handleEvent(SOCKET_EVENTS.SESSION_CREATED, message.data);
      //   }
      //   break;
      // }

      // case 'session-joined': {
      //   // Unido a sesión
      //   this.handleEvent(SOCKET_EVENTS.SESSION_JOINED, message.data || {});
      //   break;
      // }

      // case 'session-error': {
      //   // Error de sesión
      //   this.handleEvent(
      //     SOCKET_EVENTS.SESSION_ERROR,
      //     message.data || { error: 'Error desconocido' }
      //   );
      //   break;
      // }

      // case 'audio-state': {
      //   // Estado de audio del SFU
      //   this.handleEvent(SOCKET_EVENTS.AUDIO_STATE, message.data as any);
      //   break;
      // }

      // case 'playlist-sync': {
      //   // Sincronización de playlist
      //   this.handleEvent(SOCKET_EVENTS.PLAYLIST_SYNC, message.data as any);
      //   break;
      // }

      // case 'participant-joined': {
      //   this.handleEvent(SOCKET_EVENTS.PARTICIPANT_JOINED, message.data || {});
      //   break;
      // }

      // case 'participant-left': {
      //   this.handleEvent(SOCKET_EVENTS.PARTICIPANT_LEFT, message.data || {});
      //   break;
      // }

      default:
        console.warn('Tipo de mensaje de señalización desconocido:', message.type);
    }
  }

  /**
   * Envía un mensaje de señalización al SFU
   */
  private sendSignalingMessage(message: SFUSignalingMessage): void {
    if (!this.signalingWebSocket || this.signalingWebSocket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket de señalización no está conectado');
      return;
    }

    try {
      const messageToSend = {
        ...message,
        sessionId: this.sessionId || undefined,
        role: this.role || undefined,
        peerId: this.peerId || undefined,
      };

      this.signalingWebSocket.send(JSON.stringify(messageToSend));
    } catch (error) {
      console.error('Error al enviar mensaje de señalización:', error);
    }
  }

  /**
   * Inicializa la conexión peer-to-SFU
   */
  private async initializePeerConnection(): Promise<void> {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(this.RTC_CONFIG);

    // Manejar ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          data: event.candidate,
        });
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

    // Manejar tracks recibidos del SFU (si es necesario)
    this.peerConnection.ontrack = (_event) => {
      // En esta aplicación, no necesitamos manejar tracks de audio directamente
      // porque usamos el elemento HTML5 Audio en lugar de WebRTC audio tracks
    };
  }

  /**
   * Crea el data channel para comunicación de control
   */
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
        console.error('Error en reconexión SFU:', error);
      });
    }, delay);
  }

  /**
   * Desconecta del SFU
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

    if (this.signalingWebSocket) {
      this.signalingWebSocket.close();
      this.signalingWebSocket = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.handleEvent(SOCKET_EVENTS.CONNECTION_STATUS, { connected: false });
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    // Considerar conectado si el WebSocket de señalización está abierto
    // El data channel puede tardar en abrirse, pero el WebSocket es suficiente para comunicación básica
    const signalingConnected = this.signalingWebSocket?.readyState === WebSocket.OPEN;
    const dataChannelOpen = this.dataChannel?.readyState === 'open';

    // Si el data channel está abierto, definitivamente está conectado
    if (dataChannelOpen && signalingConnected) {
      return true;
    }

    // Si solo el WebSocket está conectado, también considerarlo conectado
    // (el data channel puede tardar en establecerse)
    return signalingConnected;
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
   * Emite un evento al SFU a través del data channel o WebSocket
   */
  emit(_event: string, data?: unknown): void {
    // Intentar enviar por data channel primero (más rápido)
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(
          JSON.stringify({
            type: 'playback-state',
            // event,
            // payload: data,
            ...(data as Record<string, unknown>),
            // sessionId: this.sessionId || undefined,
          })
        );
        return;
      } catch (error) {
        console.warn('Error al enviar por data channel, intentando WebSocket:', error);
      }
    }

    // Fallback a WebSocket de señalización
    this.sendSignalingMessage({
      type: 'playback-state',
      // event,
      ...(data as Record<string, unknown>),
      // payload: data,
    });
  }

  /**
   * Crea una nueva sesión (solo host)
   */
  async createSession(name?: string): Promise<void> {
    try {
      this.role = 'host';
      this.sendSignalingMessage({
        room: name ?? 'Demo01',
        userName: 'FredyMax',
        type: 'join',
      });
    } catch (error) {
      console.error('Error al crear sesión:', error);
      this.handleEvent(SOCKET_EVENTS.SESSION_ERROR, { error: 'Error al crear sesión' });
    }
  }

  /**
   * Se une a una sesión existente
   */
  async joinSession(sessionIdToJoin: string): Promise<void> {
    try {
      this.sessionId = sessionIdToJoin;
      this.role = 'listener';

      this.sendSignalingMessage({
        type: 'join',
        room: sessionIdToJoin,
        userName: 'FredyMax',
      });

      // También enviar join-room si el SFU lo requiere
      this.sendSignalingMessage({
        type: 'join',
        room: sessionIdToJoin,
        userName: 'FredyMax',
      });
    } catch (error) {
      console.error('Error al unirse a sesión:', error);
      this.handleEvent(SOCKET_EVENTS.SESSION_ERROR, { error: 'Error al unirse a sesión' });
    }
  }

  /**
   * Abandona la sesión actual
   */
  async leaveSession(sessionIdToLeave: string): Promise<void> {
    try {
      this.sendSignalingMessage({
        type: 'session-leave',
        data: { sessionId: sessionIdToLeave },
      });

      this.sendSignalingMessage({
        type: 'leave-room',
        room: sessionIdToLeave,
      });
    } catch (error) {
      console.error('Error al abandonar sesión:', error);
    } finally {
      this.disconnect();
      this.sessionId = null;
      this.role = null;
    }
  }

  /**
   * Emite el estado de playback usando el nuevo evento playback-state
   */
  private emitPlaybackState(position: number, isPlaying: boolean, trackUrl: string): void {
    const room = this.sessionId || '';
    const userName = 'FredyMax'; // TODO: obtener del estado de sesión

    this.emit(SOCKET_EVENTS.PLAYBACK_STATE, {
      room,
      userName,
      position,
      isPlaying,
      truckUrl: trackUrl,
    });
  }

  /**
   * Reproduce el audio (solo host)
   */
  playAudio(timestamp: number, position?: number, trackUrl?: string): void {
    console.log('Emit Play', {
      room: this.sessionId || '',
      userName: 'FredyMax',
      position: position ?? 0,
      isPlaying: true,
      truckUrl: trackUrl,
      timestamp,
    });
    // Mantener compatibilidad con el evento antiguo
    this.emit(SOCKET_EVENTS.AUDIO_PLAY, {
      room: this.sessionId || '',
      userName: 'FredyMax',
      position: position ?? 0,
      isPlaying: true,
      truckUrl: trackUrl,
      timestamp,
    });

    // Emitir nuevo evento playback-state si se proporcionan los parámetros
    // if (position !== undefined && trackUrl) {
    //   this.emitPlaybackState(position, true, trackUrl);
    // }
  }

  /**
   * Pausa el audio (solo host)
   */
  pauseAudio(timestamp: number, position?: number, trackUrl?: string): void {
    // Mantener compatibilidad con el evento antiguo
    this.emit(SOCKET_EVENTS.AUDIO_PAUSE, {
      room: this.sessionId || '',
      userName: 'FredyMax',
      position: position ?? 0,
      isPlaying: false,
      truckUrl: trackUrl,
      timestamp,
    });

    // Emitir nuevo evento playback-state si se proporcionan los parámetros
    if (position !== undefined && trackUrl) {
      this.emitPlaybackState(position, false, trackUrl);
    }
  }

  /**
   * Cambia la posición del audio (solo host)
   */
  seekAudio(position: number, _timestamp: number, trackUrl?: string): void {
    // Mantener compatibilidad con el evento antiguo
    // this.emit(SOCKET_EVENTS.AUDIO_SEEK, { position, timestamp });

    // Emitir nuevo evento playback-state si se proporciona trackUrl
    if (trackUrl) {
      // Obtener isPlaying del estado actual si es posible
      // Por ahora, asumimos que sigue reproduciendo después de seek
      this.emitPlaybackState(position, true, trackUrl);
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
   * Obtiene el ID del peer
   */
  getSocketId(): string | undefined {
    return this.peerId || this.sessionId || undefined;
  }
}

// Singleton instance
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
