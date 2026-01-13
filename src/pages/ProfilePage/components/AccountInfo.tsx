import { Mail, Phone, ShieldCheck } from 'lucide-react';
import { cn, extractCharacters, formatPhoneNumber } from '@/shared/utils';
import { btnColors } from '@shared/components/Button/Button';

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
            <div className="flex-1 min-w-0">
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-0.5">
                Email
              </p>
              <p className="text-sm sm:text-base font-medium text-light-text dark:text-dark-text truncate">
                {user.email}
              </p>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                Not editable
              </p>
            </div>
          </div>
        ) : user?.phone ? (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary-light/10">
              <Phone size={18} className="text-primary dark:text-primary-light" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-0.5">
                Phone
              </p>
              <p className="text-sm sm:text-base font-medium text-light-text dark:text-dark-text truncate">
                {formatPhoneNumber(extractCharacters(user.phone, -10))}
              </p>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                Not editable
              </p>
            </div>
            <div
              className={cn(
                btnColors.emerald,
                'py-1 flex items-center justify-center gap-1 px-3 rounded-full pointer-events-none'
              )}
            >
              <ShieldCheck size={18} className="mx-auto" />
              <span className="hidden sm:inline text-sm leading-3">Verified</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
