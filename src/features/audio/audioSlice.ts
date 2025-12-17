/**
 * Redux slice para gestión de audio
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AudioState } from '@shared/types';
import { isValidAudioUrl } from '@shared/utils';

interface AudioReducerState extends AudioState {
  isLoading: boolean;
  error: string | null;
}

const initialState: AudioReducerState = {
  isPlaying: false,
  currentPosition: 0,
  volume: 100,
  trackId: '',
  trackUrl: '',
  trackTitle: undefined,
  trackArtist: undefined,
  trackDuration: undefined,
  timestamp: Date.now(),
  isLoading: false,
  error: null,
};

const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    setTrack: (
      state,
      action: PayloadAction<{
        trackId: string;
        trackUrl: string;
        trackTitle?: string;
        trackArtist?: string;
      }>
    ) => {
      // Validar que trackUrl sea válida antes de guardar
      if (!isValidAudioUrl(action.payload.trackUrl)) {
        console.error(
          'Error: Intento de guardar una URL inválida como trackUrl:',
          action.payload.trackUrl,
          'Debe ser una URL de archivo de audio válida (ej: .mp3, .wav, etc.)'
        );
        // No actualizar si la URL es inválida
        state.error = 'URL de audio no válida. Debe ser un archivo de audio (ej: .mp3, .wav, etc.)';
        return;
      }

      state.trackId = action.payload.trackId;
      state.trackUrl = action.payload.trackUrl;
      state.trackTitle = action.payload.trackTitle;
      state.trackArtist = action.payload.trackArtist;
      state.currentPosition = 0;
      state.isLoading = true;
      state.error = null; // Limpiar errores anteriores
    },
    setAudioState: (state, action: PayloadAction<AudioState>) => {
      // Validar valores antes de actualizar
      // Validar que trackUrl sea válida (debe ser un archivo de audio válido)
      let validTrackUrl = action.payload.trackUrl;
      if (validTrackUrl && !isValidAudioUrl(validTrackUrl)) {
        console.warn(
          'Intento de guardar una URL inválida como trackUrl:',
          validTrackUrl,
          'Preservando URL anterior'
        );
        // Preservar el trackUrl actual si el nuevo es inválido
        validTrackUrl = state.trackUrl;
      } else if (!validTrackUrl) {
        // Si no hay trackUrl, preservar el actual
        validTrackUrl = state.trackUrl;
      }

      const payload = {
        ...action.payload,
        trackUrl: validTrackUrl, // Usar la URL validada
        currentPosition: isNaN(action.payload.currentPosition)
          ? state.currentPosition
          : Math.max(0, action.payload.currentPosition),
        trackDuration:
          action.payload.trackDuration && !isNaN(action.payload.trackDuration)
            ? Math.max(0, action.payload.trackDuration)
            : state.trackDuration,
        volume: isNaN(action.payload.volume)
          ? state.volume
          : Math.max(0, Math.min(100, action.payload.volume)),
      };

      return {
        ...state,
        ...payload,
        isLoading: false,
        error: null,
      };
    },
    play: (state, action: PayloadAction<{ timestamp: number }>) => {
      state.isPlaying = true;
      state.timestamp = action.payload.timestamp;
    },
    pause: (state, action: PayloadAction<{ timestamp: number }>) => {
      state.isPlaying = false;
      state.timestamp = action.payload.timestamp;
    },
    seek: (state, action: PayloadAction<{ position: number; timestamp: number }>) => {
      state.currentPosition = action.payload.position;
      state.timestamp = action.payload.timestamp;
    },
    setVolume: (state, action: PayloadAction<{ volume: number }>) => {
      state.volume = action.payload.volume;
    },
    setLoading: (state, action: PayloadAction<{ isLoading: boolean }>) => {
      state.isLoading = action.payload.isLoading;
    },
    setError: (state, action: PayloadAction<{ error: string }>) => {
      state.error = action.payload.error;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    reset: () => initialState,
  },
});

export const {
  setTrack,
  setAudioState,
  play,
  pause,
  seek,
  setVolume,
  setLoading,
  setError,
  clearError,
  reset,
} = audioSlice.actions;

export default audioSlice.reducer;
