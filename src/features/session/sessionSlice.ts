import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SessionInfo, UserRole } from '@shared/types';
import { IRoomUser, IRoomUsers } from '../groups/groups.types';

interface SessionState {
  sessionId: string | null;
  hostId: string | null;
  role: UserRole | null;
  participantCount: number;
  isCreating: boolean;
  isJoining: boolean;
  error: string | null;
  sessionName?: string;
  connectionUsers: Record<string, IRoomUser>;
}

const initialState: SessionState = {
  sessionId: null,
  hostId: null,
  role: null,
  participantCount: 0,
  isCreating: false,
  isJoining: false,
  error: null,
  sessionName: undefined,
  connectionUsers: {},
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    createSessionStart: (state, action: PayloadAction<{ name?: string }>) => {
      state.isCreating = true;
      state.error = null;
      state.sessionName = action.payload.name;
    },
    createSessionSuccess: (state, action: PayloadAction<{ sessionId: string }>) => {
      state.isCreating = false;
      state.sessionId = action.payload.sessionId;
      state.hostId = action.payload.sessionId;
      state.role = 'dj';
      state.error = null;
    },
    createSessionFailure: (state, action: PayloadAction<{ error: string }>) => {
      state.isCreating = false;
      state.error = action.payload.error;
    },
    joinSessionStart: (state, _action: PayloadAction<{ sessionId: string }>) => {
      state.isJoining = true;
      state.error = null;
    },
    joinSessionSuccess: (state, action: PayloadAction<SessionInfo>) => {
      state.isJoining = false;
      state.sessionId = action.payload.sessionId;
      state.hostId = action.payload.hostId;
      state.role = 'member';
      state.participantCount = action.payload.participantCount;
      state.error = null;
    },
    joinSessionFailure: (state, action: PayloadAction<{ error: string }>) => {
      state.isJoining = false;
      state.error = action.payload.error;
    },
    leaveSession: (state) => {
      state.sessionId = null;
      state.hostId = null;
      state.role = null;
      state.participantCount = 0;
      state.error = null;
      state.sessionName = undefined;
    },
    updateParticipantCount: (state, action: PayloadAction<{ count: number }>) => {
      state.participantCount = action.payload.count;
    },
    setRole: (state, action: PayloadAction<{ role: UserRole }>) => {
      state.role = action.payload.role;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateConnectionUsers: (state, action: PayloadAction<IRoomUsers>) => {
      const { users } = action.payload;
      const newConnectionUsers: Record<string, IRoomUser> = {};
      users.forEach((user) => (newConnectionUsers[user.odooUserId] = user));
      state.connectionUsers = { ...state.connectionUsers, ...newConnectionUsers };
    },
    addConnectionUser: (state, action: PayloadAction<IRoomUser>) => {
      state.connectionUsers[action.payload.odooUserId] = action.payload;
    },
    removeConnectionUser: (state, action: PayloadAction<IRoomUser>) => {
      const { odooUserId } = action.payload;
      delete state.connectionUsers[odooUserId];
    },
  },
});

export const {
  createSessionStart,
  createSessionSuccess,
  createSessionFailure,
  joinSessionStart,
  joinSessionSuccess,
  joinSessionFailure,
  leaveSession,
  updateParticipantCount,
  clearError,
  setRole,
  updateConnectionUsers,
  addConnectionUser,
  removeConnectionUser,
} = sessionSlice.actions;

export default sessionSlice.reducer;
