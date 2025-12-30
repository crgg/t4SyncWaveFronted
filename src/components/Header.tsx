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
    if (user?.avatar_url) {
      e.stopPropagation();
      setIsAvatarPreviewOpen(true);
    } else {
      handleToggleSidebar();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-light-card dark:bg-dark-card border-b border-light-hover dark:border-dark-hover shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/"
              className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent"
            >
              T4SyncWave
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />

              <button
                onClick={handleAvatarClick}
                className={cn(
                  'rounded-full dark:bg-[#B0FFEF] bg-[#5bfada] font-bold w-8 h-8 flex items-center justify-center text-zinc-800 text-xs relative overflow-hidden',
                  user?.avatar_url &&
                    'cursor-pointer hover:ring-2 hover:ring-primary-500/50 transition-all'
                )}
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name || 'User'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(user?.name)
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
          name={user.name}
        />
      )}
    </>
  );
}
