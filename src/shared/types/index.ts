/**
 * Tipos compartidos de la aplicación
 */

export interface AudioState {
  isPlaying: boolean;
  currentPosition: number; // Posición en segundos
  volume: number; // 0-100
  trackId: string;
  trackUrl: string;
  trackTitle?: string;
  trackArtist?: string;
  trackDuration?: number;
  timestamp: number; // Timestamp del servidor
  // new fields
  truckUrl?: string;
}

export interface SessionInfo {
  sessionId: string;
  hostId: string;
  participantCount: number;
  createdAt: number;
  name?: string;
}

export type UserRole = 'host' | 'listener';

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  latency: number; // Latencia en ms
  reconnectAttempts: number;
  lastError?: string;
}

export interface SyncState {
  isSynced: boolean;
  syncOffset: number; // Diferencia en ms
  lastSyncTime: number;
}

export interface Participant {
  id: string;
  role: UserRole;
  joinedAt: number;
}

export interface Track {
  id: string;
  url: string;
  title: string;
  artist: string;
  duration?: number; // Duración en segundos
  addedAt: number; // Timestamp cuando se agregó
}

export interface Auth {
  id: string;
  name: string;
  email: string;
}
