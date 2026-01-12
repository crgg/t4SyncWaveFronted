import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { AvatarPreview } from '@/shared/components/AvatarPreview/AvatarPreview';
import { ThemeToggle } from '@shared/components/ThemeToggle/ThemeToggle';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { layoutActions } from '@/app/slices/layoutSlice';
import { getInitials } from '@/shared/utils';

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

  const avatarPreview = user?.avatar_url;
  const isLoadingAvatar = false;

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
              <button onClick={handleAvatarClick}>
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-white text-sm font-bold w-8 h-8 flex items-center justify-center">
                      {getInitials(user?.displayName || '?')}
                    </div>
                  )}
                  {isLoadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="animate-spin text-white" size={24} />
                    </div>
                  )}
                </div>
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
          name={user.displayName || 'Unknown'}
        />
      )}
    </>
  );
}
