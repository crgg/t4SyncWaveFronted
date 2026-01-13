import { motion } from 'framer-motion';
import { Edit2, Camera, MailPlus, Lock, TriangleAlert, ArrowLeftCircle } from 'lucide-react';

import { cn } from '@shared/utils';

interface ProfileActionsProps {
  user: IUserData | null;
  hasEmail: boolean;
  isLoadingAvatar: boolean;
  onEditProfile: () => void;
  onAvatarClick: () => void;
  onAddEmail: () => void;
  onChangePassword: () => void;
  onCreatePassword: () => void;
  onLogout: () => void;
}

export function ProfileActions({
  user,
  hasEmail,
  isLoadingAvatar,
  onEditProfile,
  onAvatarClick,
  onAddEmail,
  onChangePassword,
  onCreatePassword,
  onLogout,
}: ProfileActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-1"
    >
      <h3 className="text-xs font-semibold tracking-wider text-zinc-500 dark:text-zinc-400">
        Actions
      </h3>
      <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-hover/30 dark:border-dark-hover/30 overflow-hidden">
        {/* Edit Profile */}
        <button
          onClick={onEditProfile}
          className="w-full flex items-center gap-3 p-4 hover:bg-light-hover/10 dark:hover:bg-dark-hover/50 transition-colors touch-manipulation active:scale-[0.98] border-b border-light-hover/30 dark:border-dark-hover/30"
        >
          <Edit2 size={20} className="text-primary dark:text-primary-light flex-shrink-0" />
          <span className="text-sm sm:text-base font-medium text-primary dark:text-primary-light">
            Edit Profile
          </span>
        </button>

        {/* Change Avatar */}
        <button
          onClick={onAvatarClick}
          disabled={isLoadingAvatar}
          className="w-full flex items-center gap-3 p-4 hover:bg-light-hover/10 dark:hover:bg-dark-hover/50 transition-colors touch-manipulation active:scale-[0.98] border-b border-light-hover/30 dark:border-dark-hover/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera size={20} className="text-primary dark:text-primary-light flex-shrink-0" />
          <span className="text-sm sm:text-base font-medium text-primary dark:text-primary-light">
            Change Avatar
          </span>
        </button>

        {/* Add/Edit Email */}
        {!hasEmail && (
          <button
            onClick={onAddEmail}
            className="w-full flex items-center gap-3 p-4 hover:bg-light-hover/10 dark:hover:bg-dark-hover/50 transition-colors touch-manipulation active:scale-[0.98] border-b border-light-hover/30 dark:border-dark-hover/30"
          >
            <MailPlus size={20} className="text-primary dark:text-primary-light flex-shrink-0" />
            <span className="text-sm sm:text-base font-medium text-primary dark:text-primary-light">
              Add Email
            </span>
          </button>
        )}

        {hasEmail && (
          <button
            onClick={user?.hasPassword ? onChangePassword : onCreatePassword}
            disabled={!hasEmail}
            className="disabled:cursor-not-allowed flex items-center gap-3 w-full p-4 hover:bg-light-hover/10 dark:hover:bg-dark-hover/50 transition-colors touch-manipulation active:scale-[0.98] border-b border-light-hover/30 dark:border-dark-hover/30"
          >
            {user?.hasPassword ? (
              <Lock size={20} className="text-primary dark:text-primary-light flex-shrink-0" />
            ) : (
              <TriangleAlert size={20} className="text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
            )}
            <div>
              <div className="flex gap-3">
                <span
                  className={cn(
                    'text-sm sm:text-base font-medium',
                    user?.hasPassword
                      ? 'text-primary dark:text-primary-light'
                      : 'text-zinc-500 dark:text-zinc-400'
                  )}
                >
                  {user?.hasPassword ? 'Change' : 'Create'} Password
                </span>
              </div>
              {!user?.hasPassword && (
                <div className="text-xs text-start text-zinc-500 dark:text-zinc-400">
                  <p>Do you want to create your password?</p>
                  <p>You must set up an email address.</p>
                </div>
              )}
            </div>
          </button>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 p-4 hover:bg-light-hover/10 dark:hover:bg-dark-hover/50 transition-colors touch-manipulation active:scale-[0.98]"
        >
          <ArrowLeftCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm sm:text-base font-medium text-red-600 dark:text-red-400">
            Logout
          </span>
        </button>
      </div>
    </motion.div>
  );
}
