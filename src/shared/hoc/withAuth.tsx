import { Navigate } from 'react-router-dom';

import { STORAGE_KEYS } from '@shared/constants';
import { paths } from '@/routes/paths';

export const withAuth = <T extends object>(Component: React.ComponentType<T>) => {
  return (props: T) => {
    const isAuthenticated = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!isAuthenticated) return <Navigate to={paths.AUTH} />;
    return <Component {...props} />;
  };
};
