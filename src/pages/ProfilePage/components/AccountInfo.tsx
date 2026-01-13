import { Mail, Phone } from 'lucide-react';

import { cn } from '@/shared/utils';

interface AccountInfoProps {
  user: IUserData | null;
}

export function AccountInfo({ user }: AccountInfoProps) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold tracking-wider text-zinc-500 dark:text-zinc-400">
        Account
      </h3>
      <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 space-y-2 border border-light-hover/30 dark:border-dark-hover/30">
        {user?.email ? (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary-light/10">
              <Mail size={18} className="text-primary dark:text-primary-light" />
            </div>
            <div className="flex-1 flex justify-between min-w-0">
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary">
                Email
              </p>
              <p className="text-sm sm:text-base font-medium text-light-text dark:text-dark-text truncate">
                {user.email}
              </p>
            </div>
          </div>
        ) : user?.phone ? (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary-light/10">
              <Phone size={18} className="text-primary dark:text-primary-light" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary">
                Phone
              </p>
            </div>
            <div className={cn('py-1 px-3 rounded-full pointer-events-none text-end')}>
              <p className="text-sm sm:text-base font-medium text-light-text dark:text-dark-text truncate leading-none">
                {user.phone}
              </p>
              <p className="text-sm text-zinc-400 dark:text-zinc-400 leading-none">
                Phone verification
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
