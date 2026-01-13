import { RefObject } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { getInitials } from '@/shared/utils';

interface ProfileHeaderProps {
  user: IUserData | null;
  avatarPreview: string | null;
  isLoadingAvatar: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileHeader({
  user,
  avatarPreview,
  isLoadingAvatar,
  fileInputRef,
  onAvatarChange,
}: ProfileHeaderProps) {
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const signedWithEmail = user?.authProviders[0] === 'email';

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-2xl p-4 sm:p-6 shadow-sm border border-light-hover/30 dark:border-dark-hover/30">
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="relative flex-shrink-0">
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={`Avatar of ${user?.displayName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 flex items-center justify-center">
                {getInitials(user?.displayName || '?')}
              </div>
            )}
            {isLoadingAvatar && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={24} />
              </div>
            )}
          </div>

          <button
            onClick={handleAvatarClick}
            disabled={isLoadingAvatar}
            className="absolute bottom-0 -right-2 w-7 h-7 sm:w-8 sm:h-8 bg-white dark:bg-dark-card rounded-full flex items-center justify-center shadow-lg border-2 border-light-bg dark:border-dark-bg hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            aria-label="Change avatar"
          >
            <Camera size={14} className="text-primary dark:text-primary-light" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onAvatarChange}
            className="hidden"
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-0 justify-center">
          {user?.name && (
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-light-text dark:text-dark-text">
              {user?.name || 'User'}
            </h2>
          )}
          {user?.nickname && (
            <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary">
              @{user.nickname}
            </p>
          )}
          <p className="text-xs text-zinc-400 mt-1 dark:text-zinc-400">
            {signedWithEmail ? 'Session started with email' : 'Signed in with phone verification'}
          </p>
        </div>
      </div>
    </div>
  );
}
