import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { Header } from '@shared/components/Header/Header';
import SidebarLayout from './Sidebar.layout';
import { MobileGroupsTabs } from '../components/MobileGroupsTabs/MobileGroupsTabs';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { layoutActions, LayoutState } from '@/app/slices/layoutSlice';
import { paths } from '@/routes/paths';
import { profileService } from '@/services/profile';
import { authActions } from '@/features/auth/authSlice';
import { STORAGE_KEYS } from '@/shared/constants';
import { getErrorMessage } from '@/shared/utils';
import { inboxApi } from '@/features/inbox/inboxApi';
import { useQuery } from '@tanstack/react-query';

const AppLayout = () => {
  const activeTab = useAppSelector((state) => state.layout.activeTab);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['inbox'],
    queryFn: inboxApi.getInvitations,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 2,
  });

  const invitations = data?.invitations ?? [];
  const countInvitations = invitations.reduce(
    (acc, invitation) => acc + (invitation.status === 'pending' ? 1 : 0),
    0
  );

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
    switch (tab) {
      case 'my-groups':
        navigate(paths.GROUPS(null));
        return;
      case 'listeners':
        navigate(paths.LISTENERS(null));
        return;
      case 'library':
        navigate(paths.LIBRARY);
        return;
      case 'inbox':
        navigate(paths.INBOX);
        return;
      default:
        navigate(paths.PROFILE);
        return;
    }
  };

  return (
    <>
      <SidebarLayout />
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors duration-200">
        <Header />
        <div className="min-h-[calc(100vh-4rem)] p-2 flex flex-col justify-between items-center">
          <Outlet />
        </div>
      </div>
      <MobileGroupsTabs
        countInvitations={countInvitations}
        onTabChange={onTabChange}
        activeTab={activeTab}
      />
    </>
  );
};

export default AppLayout;
