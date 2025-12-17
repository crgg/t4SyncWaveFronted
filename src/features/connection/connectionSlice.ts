/**
 * Redux slice para gestión de conexión WebSocket
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ConnectionState } from '@shared/types';

const initialState: ConnectionState = {
  isConnected: false,
  isConnecting: false,
  latency: 0,
  reconnectAttempts: 0,
  lastError: undefined,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    connecting: (state) => {
      state.isConnecting = true;
      state.lastError = undefined;
    },
    connected: (state) => {
      state.isConnected = true;
      state.isConnecting = false;
      state.reconnectAttempts = 0;
      state.lastError = undefined;
    },
    disconnected: (state, action: PayloadAction<{ error?: string }>) => {
      state.isConnected = false;
      state.isConnecting = false;
      if (action.payload.error) {
        state.lastError = action.payload.error;
      }
    },
    setLatency: (state, action: PayloadAction<{ latency: number }>) => {
      state.latency = action.payload.latency;
    },
    incrementReconnectAttempts: (state) => {
      state.reconnectAttempts += 1;
    },
    resetReconnectAttempts: (state) => {
      state.reconnectAttempts = 0;
    },
    setError: (state, action: PayloadAction<{ error: string }>) => {
      state.lastError = action.payload.error;
    },
    clearError: (state) => {
      state.lastError = undefined;
    },
  },
});

export const {
  connecting,
  connected,
  disconnected,
  setLatency,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  setError,
  clearError,
} = connectionSlice.actions;

export default connectionSlice.reducer;
