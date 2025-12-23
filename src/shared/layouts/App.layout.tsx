import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

import { Header } from '@/components/Header';
import SidebarLayout from './Sidebar.layout';
import { MobileGroupsTabs } from '../components/MobileGroupsTabs/MobileGroupsTabs';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { layoutActions, LayoutState } from '@/app/slices/layoutSlice';
import { useWebSocket } from '../hooks/useWebSocket';
import { paths } from '@/routes/paths';

const AppLayout = () => {
  const activeTab = useAppSelector((state) => state.layout.activeTab);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { ping } = useWebSocket();

  const onTabChange = (tab: LayoutState['activeTab']) => {
    dispatch(layoutActions.setActiveTab(tab));

    if (tab === 'my-groups') {
      navigate(paths.GROUPS(null));
    } else if (tab === 'listeners') {
      navigate(paths.LISTENERS(null));
    } else {
      navigate(paths.HOME);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      ping();
    }, 1000 * 30);
    return () => clearInterval(interval);
  }, [ping]);

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
