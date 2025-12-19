import { Link } from 'react-router-dom';

import { ThemeToggle } from './ThemeToggle';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { layoutActions } from '@/app/slices/layoutSlice';
import { getInitials } from '@/shared/utils';

export function Header() {
  const user = useAppSelector((state) => state.auth.user);
  const isSidebarOpen = useAppSelector((state) => state.layout.isSidebarOpen);
  const dispatch = useAppDispatch();

  const handleToggleSidebar = () => {
    dispatch(layoutActions.setSidebarOpen(!isSidebarOpen));
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-light-card dark:bg-dark-card border-b border-light-hover dark:border-dark-hover shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/"
              className="text-sm sm:text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent"
            >
              T4SyncWave
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />

              <div
                onClick={handleToggleSidebar}
                className="rounded-full bg-blue-600 font-bold w-8 h-8 flex items-center justify-center"
              >
                {getInitials(user?.name)}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
