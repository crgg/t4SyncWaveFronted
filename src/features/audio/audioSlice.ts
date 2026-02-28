import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AudioState } from '@shared/types';
import { isValidAudioUrl } from '@shared/utils';
import { STORAGE_KEYS } from '@shared/constants';

interface AudioReducerState extends AudioState {
  isLoading: boolean;
  error: string | null;
  isMuted: boolean;
  previousVolume: number; // Para restaurar el volumen después de desmutear
}

// Función para obtener el estado inicial desde localStorage
const getInitialState = (): AudioReducerState => {
  const savedVolume = localStorage.getItem(STORAGE_KEYS.VOLUME);
  const savedIsMuted = localStorage.getItem(STORAGE_KEYS.IS_MUTED);
  const savedPreviousVolume = localStorage.getItem(STORAGE_KEYS.PREVIOUS_VOLUME);

  let volume = 100;
  let isMuted = false;
  let previousVolume = 100;

  if (savedVolume) {
    const parsedVolume = parseFloat(savedVolume);
    if (!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 100) {
      volume = parsedVolume;
    }
  }

  if (savedIsMuted === 'true') {
    isMuted = true;
    // Si está muted, el volumen debe ser 0
    volume = 0;
  }

  if (savedPreviousVolume) {
    const parsedPreviousVolume = parseFloat(savedPreviousVolume);
    if (!isNaN(parsedPreviousVolume) && parsedPreviousVolume >= 0 && parsedPreviousVolume <= 100) {
      previousVolume = parsedPreviousVolume;
    }
  } else if (volume > 0) {
    // Si no hay previousVolume guardado pero hay volumen, usar ese volumen
    previousVolume = volume;
  }

  return {
    isPlaying: false,
    currentPosition: 0,
    volume,
    trackId: '',
    trackUrl: '',
    trackTitle: undefined,
    trackArtist: undefined,
    trackDuration: undefined,
    timestamp: Date.now(),
    isLoading: false,
    error: null,
    isMuted,
    previousVolume,
  };
};

const initialState: AudioReducerState = getInitialState();

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
        trackSource?: 'file' | 'spotify';
        spotifyId?: string;
      }>
    ) => {
      const isSpotify = action.payload.trackSource === 'spotify' || !!action.payload.spotifyId;
      // Validar URL solo para tracks de archivo
      if (!isSpotify && !isValidAudioUrl(action.payload.trackUrl)) {
        console.error(
          'Error: Intento de guardar una URL inválida como trackUrl:',
          action.payload.trackUrl,
          'Debe ser una URL de archivo de audio válida (ej: .mp3, .wav, etc.)'
        );
        state.error = 'URL de audio no válida. Debe ser un archivo de audio (ej: .mp3, .wav, etc.)';
        return;
      }

      state.trackId = action.payload.trackId;
      state.trackUrl = action.payload.trackUrl;
      state.trackTitle = action.payload.trackTitle;
      state.trackArtist = action.payload.trackArtist;
      state.trackSource = action.payload.trackSource;
      state.spotifyId = action.payload.spotifyId;
      state.currentPosition = 0;
      state.isLoading = true;
      state.error = null;
    },
    setAudioState: (state, action: PayloadAction<AudioState>) => {
      const isSpotify =
        (action.payload as any).trackSource === 'spotify' || !!(action.payload as any).spotifyId;
      let validTrackUrl = action.payload.trackUrl;
      if (isSpotify) {
        validTrackUrl = action.payload.trackUrl ?? '';
      } else if (validTrackUrl && !isValidAudioUrl(validTrackUrl)) {
        console.warn(
          'Intento de guardar una URL inválida como trackUrl:',
          validTrackUrl,
          'Preservando URL anterior'
        );
        validTrackUrl = state.trackUrl;
      } else if (!validTrackUrl) {
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
        // Preservar siempre el volumen local cuando viene de eventos del backend
        // Solo actualizar el volumen si viene explícitamente en el payload Y no es NaN
        // Pero si el volumen del payload es undefined o viene de un evento del backend,
        // preservar el volumen actual
        volume:
          action.payload.volume !== undefined && !isNaN(action.payload.volume)
            ? Math.max(0, Math.min(100, action.payload.volume))
            : state.volume,
      };

      return {
        ...state,
        ...payload,
        // Preservar isMuted y previousVolume cuando viene de eventos del backend
        isMuted:
          (action.payload as any).isMuted !== undefined
            ? (action.payload as any).isMuted
            : state.isMuted,
        previousVolume:
          (action.payload as any).previousVolume !== undefined
            ? (action.payload as any).previousVolume
            : state.previousVolume,
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
      // Si se establece un volumen mayor a 0, actualizar previousVolume y desmutear
      if (action.payload.volume > 0) {
        state.previousVolume = action.payload.volume;
        state.isMuted = false;
      } else if (action.payload.volume === 0 && state.isMuted) {
        // Si el volumen es 0 y está muted, mantener el estado de muted
        // No hacer nada adicional
      } else if (action.payload.volume === 0 && !state.isMuted) {
        // Si el volumen es 0 pero NO está muted, mantener previousVolume
        // El usuario puede haber puesto el volumen en 0 manualmente
        if (state.previousVolume === 0 || state.previousVolume === 100) {
          state.previousVolume = 100; // Asegurar un valor por defecto
        }
      }
    },
    toggleMute: (state) => {
      if (state.isMuted) {
        // Desmutear: restaurar el volumen anterior
        state.volume = state.previousVolume > 0 ? state.previousVolume : 100;
        state.isMuted = false;
      } else {
        // Mutear: guardar el volumen actual y ponerlo en 0
        state.previousVolume = state.volume > 0 ? state.volume : 100;
        state.volume = 0;
        state.isMuted = true;
      }
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
  toggleMute,
  setLoading,
  setError,
  clearError,
  reset,
} = audioSlice.actions;

export default audioSlice.reducer;
