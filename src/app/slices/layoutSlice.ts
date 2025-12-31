import { paths } from '@/routes/paths';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ActiveTab = 'my-groups' | 'listeners' | 'home' | 'profile';

export interface LayoutState {
  isSidebarOpen: boolean;
  activeTab: ActiveTab;
}

const initialState = (): LayoutState => {
  const isMyGroups = new URL(window.location.href);
  let activeTab: ActiveTab;

  if (isMyGroups.pathname.startsWith(paths.LISTENERS(null))) {
    activeTab = 'listeners';
  } else if (isMyGroups.pathname.startsWith(paths.GROUPS(null))) {
    activeTab = 'my-groups';
  } else if (isMyGroups.pathname === paths.PROFILE) {
    activeTab = 'profile';
  } else {
    activeTab = 'my-groups';
  }

  return {
    isSidebarOpen: false,
    activeTab,
  };
};

const layoutSlice = createSlice({
  name: 'layout',
  initialState: initialState(),
  reducers: {
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<ActiveTab>) => {
      state.activeTab = action.payload;
    },
  },
});

export const layoutActions = layoutSlice.actions;

export default layoutSlice.reducer;
