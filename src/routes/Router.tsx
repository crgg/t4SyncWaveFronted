import { lazy } from 'react';
import { Navigate, RouteObject, useRoutes } from 'react-router-dom';

// import HostPage from '@/pages/HostPage';
// import ListenerPage from '@/pages/ListenerPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import NotFoundPage from '@/pages/NotFoundPage';
import AppLayout from '@/shared/layouts/App.layout';
import AuthLayout from '@/shared/layouts/Auth.layout';
import AuthPage from '@/pages/AuthPage';
import PhoneNumberPage from '@/pages/PhoneNumberPage/PhoneNumberPage';
import VerificationCodePage from '@/pages/VerificationCodePage/VerificationCodePage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import { paths } from './paths';

const GroupsPage = lazy(() => import('@/pages/GroupsPage'));
const GroupPage = lazy(() => import('@/pages/GroupPage'));
const LibraryPage = lazy(() => import('@/pages/LibraryPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage/ProfilePage'));
const InboxPage = lazy(() => import('@/pages/InboxPage'));

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
        path: paths.LIBRARY,
        element: <LibraryPage />,
      },
      {
        path: paths.PROFILE,
        element: <ProfilePage />,
      },
      {
        path: paths.INBOX,
        element: <InboxPage />,
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
        path: paths.PHONE_NUMBER,
        element: <PhoneNumberPage />,
      },
      {
        path: paths.VERIFY_CODE,
        element: <VerificationCodePage />,
      },
      {
        path: paths.LOGIN,
        element: <LoginPage />,
      },
      {
        path: paths.REGISTER,
        element: <RegisterPage />,
      },
    ],
  },
  {
    path: '/legal',
    children: [
      {
        path: 'terms',
        element: <TermsPage />,
      },
      {
        path: 'privacy',
        element: <PrivacyPage />,
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
