import { Navigate } from 'react-router-dom';

import { STORAGE_KEYS } from '@shared/constants';

export const withGuest = <T extends object>(Component: React.ComponentType<T>) => {
  return (props: T) => {
    const isAuthenticated = !!localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (isAuthenticated) return <Navigate to="/" />;
    return <Component {...props} />;
  };
};
