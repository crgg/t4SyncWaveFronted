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
  PLAYBACK_STATE: 'playback-state',
  GET_ROOM_USERS: 'get-room-users',

  // Servidor -> Cliente
  SESSION_CREATED: 'session:created',
  SESSION_JOINED: 'sessionjoined',
  SESSION_ERROR: 'session:error',
  AUDIO_STATE: 'audio:state',
  AUDIO_SYNC: 'audio:sync',
  CONNECTION_STATUS: 'connection:status',
  ROOM_USERS: 'room:users',
  PARTICIPANT_JOINED: 'joined',
  PARTICIPANT_LEFT: 'left',
  MEMBER_JOINED: 'member-joined',
  MEMBER_LEFT: 'member-left',
  KICKED: 'kicked',
  PLAYLIST_SYNC: 'playlist:sync',
  ONLINE: 'pong',
  SERVER_PING: 'server-ping',
  PLAYBACK_EVENT: 'playback-event',
  REQUEST_PLAYBACK_STATE: 'request-playback-state',
  PLAYBACK_STATE_RESPONSE: 'playback-state-response',
  DJ_RETURN: 'DJ_RETURN',
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

export const STORAGE_PREFIX = 't4syncwave';

export const STORAGE_KEYS = Object.freeze({
  TOKEN: `${STORAGE_PREFIX}:token`,
  USER: `${STORAGE_PREFIX}:user`,
  THEME: `${STORAGE_PREFIX}:theme`,
  VOLUME: `${STORAGE_PREFIX}:volume`,
  IS_MUTED: `${STORAGE_PREFIX}:isMuted`,
  PREVIOUS_VOLUME: `${STORAGE_PREFIX}:previousVolume`,
} as const);

export const APP_VERSION = '1.0.0';
