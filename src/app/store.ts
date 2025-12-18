import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from '@features/session/sessionSlice';
import audioReducer from '@features/audio/audioSlice';
import connectionReducer from '@features/connection/connectionSlice';
import playlistReducer from '@features/playlist/playlistSlice';

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    audio: audioReducer,
    connection: connectionReducer,
    playlist: playlistReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignorar acciones con funciones o timestamps
        ignoredActions: ['audio/setAudioState'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
