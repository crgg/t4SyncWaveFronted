import { Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { Header } from '@/components/Header';
import SidebarLayout from './Sidebar.layout';
import { MobileGroupsTabs } from '../components/MobileGroupsTabs/MobileGroupsTabs';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { layoutActions, LayoutState } from '@/app/slices/layoutSlice';
import { playListApi } from '@/features/playlist/playListApi';
import { setPlaylistFromApi } from '@/features/playlist/playlistSlice';
import { useWebSocket } from '../hooks/useWebSocket';

const AppLayout = () => {
  const activeTab = useAppSelector((state) => state.layout.activeTab);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useWebSocket();

  const onTabChange = (tab: LayoutState['activeTab']) => {
    dispatch(layoutActions.setActiveTab(tab));
    if (tab === 'my-groups') {
      navigate('/groups/me');
    } else if (tab === 'groups') {
      navigate('/groups');
    } else {
      navigate('/');
    }
  };

  const { data: playlist } = useQuery({
    queryKey: ['playlist'],
    queryFn: () => playListApi.getPlaylist(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    // enabled: !!sessionId,
  });

  useEffect(() => {
    if (playlist) {
      const tracks = Array.isArray(playlist) ? playlist : (playlist as any)?.tracks || [];
      if (tracks.length > 0) {
        dispatch(setPlaylistFromApi({ tracks }));
      }
    }
  }, [playlist, dispatch]);

  return (
    <>
      <SidebarLayout />
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors duration-200">
        <Header />
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg dark:to-dark-surface p-2 flex flex-col justify-between items-center">
          <Outlet />
        </div>
      </div>
      <MobileGroupsTabs activeTab={activeTab} onTabChange={onTabChange} />
    </>
  );
};

export default AppLayout;
