import { lazy } from 'react';
import { RouteObject, useRoutes } from 'react-router-dom';

import HomePage from '@/pages/HomePage';
import HostPage from '@/pages/HostPage';
import ListenerPage from '@/pages/ListenerPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import UploadPage from '@/pages/UploadPage';
import AppLayout from '@/shared/layouts/App.layout';

const GroupsPage = lazy(() => import('@/pages/GroupsPage'));
const GroupPage = lazy(() => import('@/pages/GroupPage'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: '/groups',
        element: <GroupsPage />,
      },
      {
        path: '/groups/me',
        element: <GroupsPage />,
      },
      {
        path: '/groups/:groupId',
        element: <GroupPage />,
      },
      {
        path: '/upload',
        element: <UploadPage />,
      },
      {
        path: '/host/:sessionId',
        element: <HostPage />,
      },
      {
        path: '/listener/:sessionId',
        element: <ListenerPage />,
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
];

const Router = () => {
  return useRoutes(routes);
};

export default Router;
