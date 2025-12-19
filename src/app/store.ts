import { configureStore } from '@reduxjs/toolkit';

import connectionReducer from '@features/connection/connectionSlice';
import playlistReducer from '@features/playlist/playlistSlice';
import sessionReducer from '@features/session/sessionSlice';
import audioReducer from '@features/audio/audioSlice';
import layoutReducer from '@app/slices/layoutSlice';
import authReducer from '@features/auth/authSlice';

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    audio: audioReducer,
    connection: connectionReducer,
    playlist: playlistReducer,
    auth: authReducer,
    layout: layoutReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['audio/setAudioState'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

//
