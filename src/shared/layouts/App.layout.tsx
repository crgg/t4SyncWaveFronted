import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { Header } from '@/components/Header';
import SidebarLayout from './Sidebar.layout';
import { MobileGroupsTabs } from '../components/MobileGroupsTabs/MobileGroupsTabs';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { layoutActions, LayoutState } from '@/app/slices/layoutSlice';
import { useWebSocket } from '../hooks/useWebSocket';
import { paths } from '@/routes/paths';
import { profileService } from '@/services/profile';
import { authActions } from '@/features/auth/authSlice';
import { STORAGE_KEYS } from '@/shared/constants';
import { getErrorMessage } from '@/shared/utils';

const AppLayout = () => {
  const activeTab = useAppSelector((state) => state.layout.activeTab);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useWebSocket();

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token) return;

      try {
        const response = await profileService.getProfile();
        if (!response.status) {
          throw new Error(getErrorMessage(response));
        }
        dispatch(authActions.updateUser(response.user));
      } catch (err: any) {
        console.error('Error loading profile:', err);
      }
    };

    loadProfile();
  }, [dispatch]);

  const onTabChange = (tab: LayoutState['activeTab']) => {
    dispatch(layoutActions.setActiveTab(tab));

    if (tab === 'my-groups') {
      navigate(paths.GROUPS(null));
    } else if (tab === 'listeners') {
      navigate(paths.LISTENERS(null));
    } else {
      navigate(paths.PROFILE);
    }
  };

  return (
    <>
      <SidebarLayout />
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors duration-200">
        <Header />
        <div className="min-h-[calc(100vh-4rem)] bg-light-bg dark:bg-dark-bg p-2 flex flex-col justify-between items-center">
          <Outlet />
        </div>
      </div>
      <MobileGroupsTabs activeTab={activeTab} onTabChange={onTabChange} />
    </>
  );
};

export default AppLayout;
