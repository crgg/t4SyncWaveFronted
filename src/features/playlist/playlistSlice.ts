/**
 * Redux slice para gestión de playlist
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Track } from '@shared/types';

interface PlaylistState {
  tracks: Track[];
  currentTrackIndex: number | null;
}

const initialState: PlaylistState = {
  tracks: [],
  currentTrackIndex: null,
};

const playlistSlice = createSlice({
  name: 'playlist',
  initialState,
  reducers: {
    addTrack: (state, action: PayloadAction<Omit<Track, 'addedAt'>>) => {
      const newTrack: Track = {
        ...action.payload,
        addedAt: Date.now(),
      };
      state.tracks.push(newTrack);
    },
    removeTrack: (state, action: PayloadAction<{ trackId: string }>) => {
      const index = state.tracks.findIndex((t) => t.id === action.payload.trackId);
      if (index !== -1) {
        state.tracks.splice(index, 1);
        // Ajustar índice actual si es necesario
        if (state.currentTrackIndex !== null) {
          if (index < state.currentTrackIndex) {
            state.currentTrackIndex -= 1;
          } else if (index === state.currentTrackIndex) {
            // Si se elimina el track actual, ir al siguiente o al anterior
            if (state.tracks.length > 0) {
              state.currentTrackIndex = Math.min(index, state.tracks.length - 1);
            } else {
              state.currentTrackIndex = null;
            }
          }
        }
      }
    },
    setCurrentTrack: (state, action: PayloadAction<{ trackId: string }>) => {
      const index = state.tracks.findIndex((t) => t.id === action.payload.trackId);
      state.currentTrackIndex = index !== -1 ? index : null;
    },
    setCurrentTrackIndex: (state, action: PayloadAction<{ index: number }>) => {
      if (action.payload.index >= 0 && action.payload.index < state.tracks.length) {
        state.currentTrackIndex = action.payload.index;
      }
    },
    updateTrackDuration: (
      state,
      action: PayloadAction<{ trackId: string; duration: number }>
    ) => {
      const track = state.tracks.find((t) => t.id === action.payload.trackId);
      if (track) {
        track.duration = action.payload.duration;
      }
    },
    reorderTracks: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      if (
        fromIndex >= 0 &&
        fromIndex < state.tracks.length &&
        toIndex >= 0 &&
        toIndex < state.tracks.length
      ) {
        const [removed] = state.tracks.splice(fromIndex, 1);
        state.tracks.splice(toIndex, 0, removed);
        // Ajustar índice actual
        if (state.currentTrackIndex !== null) {
          if (state.currentTrackIndex === fromIndex) {
            state.currentTrackIndex = toIndex;
          } else if (fromIndex < state.currentTrackIndex && toIndex >= state.currentTrackIndex) {
            state.currentTrackIndex -= 1;
          } else if (fromIndex > state.currentTrackIndex && toIndex <= state.currentTrackIndex) {
            state.currentTrackIndex += 1;
          }
        }
      }
    },
    clearPlaylist: (state) => {
      state.tracks = [];
      state.currentTrackIndex = null;
    },
    nextTrack: (state) => {
      if (state.currentTrackIndex !== null && state.tracks.length > 0) {
        state.currentTrackIndex = (state.currentTrackIndex + 1) % state.tracks.length;
      } else if (state.tracks.length > 0) {
        state.currentTrackIndex = 0;
      }
    },
    previousTrack: (state) => {
      if (state.currentTrackIndex !== null && state.tracks.length > 0) {
        state.currentTrackIndex =
          state.currentTrackIndex === 0
            ? state.tracks.length - 1
            : state.currentTrackIndex - 1;
      } else if (state.tracks.length > 0) {
        state.currentTrackIndex = state.tracks.length - 1;
      }
    },
    syncPlaylist: (
      state,
      action: PayloadAction<{ tracks: Track[]; currentTrackIndex: number | null }>
    ) => {
      // Sincronizar playlist desde el servidor (para listeners)
      state.tracks = action.payload.tracks;
      if (
        action.payload.currentTrackIndex !== null &&
        action.payload.currentTrackIndex >= 0 &&
        action.payload.currentTrackIndex < action.payload.tracks.length
      ) {
        state.currentTrackIndex = action.payload.currentTrackIndex;
      } else {
        // Si no hay índice válido, buscar por trackId actual
        const currentTrackId = state.tracks[state.currentTrackIndex || 0]?.id;
        if (currentTrackId) {
          const index = state.tracks.findIndex((t) => t.id === currentTrackId);
          state.currentTrackIndex = index !== -1 ? index : null;
        } else {
          state.currentTrackIndex = null;
        }
      }
    },
  },
});

export const {
  addTrack,
  removeTrack,
  setCurrentTrack,
  setCurrentTrackIndex,
  updateTrackDuration,
  reorderTracks,
  clearPlaylist,
  nextTrack,
  previousTrack,
  syncPlaylist,
} = playlistSlice.actions;

export default playlistSlice.reducer;

