import { lazy } from 'react';
import { Navigate, RouteObject, useRoutes } from 'react-router-dom';

import HostPage from '@/pages/HostPage';
import ListenerPage from '@/pages/ListenerPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import NotFoundPage from '@/pages/NotFoundPage';
import AppLayout from '@/shared/layouts/App.layout';
import AuthLayout from '@/shared/layouts/Auth.layout';
import AuthPage from '@/pages/AuthPage';
import PhoneNumberPage from '@/pages/PhoneNumberPage/PhoneNumberPage';
import VerificationCodePage from '@/pages/VerificationCodePage/VerificationCodePage';
import { paths } from './paths';

const GroupsPage = lazy(() => import('@/pages/GroupsPage'));
const GroupPage = lazy(() => import('@/pages/GroupPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to={paths.GROUPS(null)} />,
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
      {
        path: paths.PROFILE,
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: paths.AUTH,
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <AuthPage />,
      },
      {
        path: 'phone-number',
        element: <PhoneNumberPage />,
      },
      {
        path: 'verify-code',
        element: <VerificationCodePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
    ],
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
