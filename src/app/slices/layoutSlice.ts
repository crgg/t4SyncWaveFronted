import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ActiveTab = 'my-groups' | 'groups' | 'home';

export interface LayoutState {
  isSidebarOpen: boolean;
  activeTab: ActiveTab;
}

const initialState = (): LayoutState => {
  const isMyGroups = new URL(window.location.href);
  let activeTab: ActiveTab = 'my-groups';

  switch (isMyGroups.pathname) {
    case '/groups/me':
      activeTab = 'my-groups';
      break;
    case '/groups':
      activeTab = 'groups';
      break;
    case '/':
      activeTab = 'home';
      break;
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
