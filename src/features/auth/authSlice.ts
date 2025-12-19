import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthResponse } from '@/services/auth';
import { Auth } from '@shared/types';
import { STORAGE_KEYS } from '@shared/constants';

export interface AuthState {
  user: Auth | null;
  token: string | null;
}

const initialState = (): AuthState => {
  const user = localStorage.getItem(STORAGE_KEYS.USER);
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  return {
    user: user ? JSON.parse(user) : null,
    token: token || null,
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<Auth>) => {
      state.user = action.payload;
    },
    login: (state, action: PayloadAction<AuthResponse>) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
    },
  },
});

export const authActions = authSlice.actions;

export default authSlice.reducer;
