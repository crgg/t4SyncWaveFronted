/**
 * Constantes de la aplicación
 */

// WebSocket
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3005';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Eventos Socket.IO
export const SOCKET_EVENTS = {
  // Cliente -> Servidor
  SESSION_CREATE: 'session:create',
  SESSION_JOIN: 'session:join',
  SESSION_LEAVE: 'session:leave',
  AUDIO_PLAY: 'audio:play',
  AUDIO_PAUSE: 'audio:pause',
  AUDIO_SEEK: 'audio:seek',
  AUDIO_VOLUME: 'audio:volume',
  AUDIO_NEXT: 'audio:next',
  SYNC_REQUEST: 'sync:request',
  PLAYLIST_UPDATE: 'playlist:update',

  // Servidor -> Cliente
  SESSION_CREATED: 'session:created',
  SESSION_JOINED: 'session:joined',
  SESSION_ERROR: 'session:error',
  AUDIO_STATE: 'audio:state',
  AUDIO_SYNC: 'audio:sync',
  CONNECTION_STATUS: 'connection:status',
  PARTICIPANT_JOINED: 'participant:joined',
  PARTICIPANT_LEFT: 'participant:left',
  PLAYLIST_SYNC: 'playlist:sync',
} as const;

// Configuración de sincronización
export const SYNC_CONFIG = {
  SYNC_INTERVAL: 5000, // Verificar sincronización cada 5 segundos
  SYNC_THRESHOLD: 500, // Re-sincronizar si diferencia > 500ms
  MAX_LATENCY: 300, // Latencia máxima aceptable (ms)
  BUFFER_SIZE: 0.5, // Buffer inicial en segundos
} as const;

// Configuración de reconexión
export const RECONNECTION_CONFIG = {
  MAX_ATTEMPTS: 5,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 10000,
  MULTIPLIER: 2,
} as const;

// UI
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
} as const;
