import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ThemeToggle } from './ThemeToggle';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { layoutActions } from '@/app/slices/layoutSlice';
import { getInitials, cn } from '@/shared/utils';
import { AvatarPreview } from '@/shared/components/AvatarPreview/AvatarPreview';

export function Header() {
  const user = useAppSelector((state) => state.auth.user);
  const isSidebarOpen = useAppSelector((state) => state.layout.isSidebarOpen);
  const dispatch = useAppDispatch();
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);

  const handleToggleSidebar = () => {
    dispatch(layoutActions.setSidebarOpen(!isSidebarOpen));
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleSidebar();
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-sm border-b border-light-hover/30 dark:border-dark-hover/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link
              to="/"
              className="text-xl sm:text-2xl font-semibold text-primary dark:text-primary-light transition-colors hover:text-primary-dark dark:hover:text-primary"
            >
              T4SyncWave
            </Link>

            <div className="flex items-center gap-3">
              <ThemeToggle />

              <button
                onClick={handleAvatarClick}
                className={cn(
                  'rounded-full w-8 h-8 flex items-center justify-center text-xs relative overflow-hidden',
                  'bg-primary/10 dark:bg-primary-light/20',
                  'border border-primary/20 dark:border-primary-light/30',
                  'hover:border-primary/40 dark:hover:border-primary-light/50',
                  'transition-all duration-200',
                  user?.avatar_url && 'cursor-pointer'
                )}
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name || 'User'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-primary dark:text-primary-light font-medium">
                    {user?.name ? getInitials(user?.name) : '?'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {user?.avatar_url && (
        <AvatarPreview
          isOpen={isAvatarPreviewOpen}
          onClose={() => setIsAvatarPreviewOpen(false)}
          imageUrl={user.avatar_url}
          name={user.name || 'Unknown'}
        />
      )}
    </>
  );
}
