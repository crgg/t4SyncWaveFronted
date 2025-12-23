import { lazy } from 'react';
import { RouteObject, useRoutes } from 'react-router-dom';

import HomePage from '@/pages/HomePage';
import HostPage from '@/pages/HostPage';
import ListenerPage from '@/pages/ListenerPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import NotFoundPage from '@/pages/NotFoundPage';
import AppLayout from '@/shared/layouts/App.layout';
import { paths } from './paths';

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
        path: paths.GROUPS(null),
        element: <GroupsPage />,
      },
      {
        path: paths.GROUPS(),
        element: <GroupPage />,
      },
      {
        path: paths.LISTENERS(null),
        element: <GroupsPage />,
      },
      {
        path: paths.LISTENERS(),
        element: <GroupPage />,
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
    path: paths.LOGIN,
    element: <LoginPage />,
  },
  {
    path: paths.REGISTER,
    element: <RegisterPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

const Router = () => {
  return useRoutes(routes);
};

export default Router;
