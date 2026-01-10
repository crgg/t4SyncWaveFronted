import { Headphones, User, UsersRound, Music2, Inbox } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import type { LayoutState } from '@/app/slices/layoutSlice';
import { paths } from '@/routes/paths';
import { cn } from '@shared/utils';

interface MobileGroupsTabsProps {
  activeTab?: LayoutState['activeTab'];
  onTabChange?: (tab: LayoutState['activeTab']) => void;
  className?: string;
  countInvitations?: number;
}

export function MobileGroupsTabs({
  onTabChange,
  className,
  countInvitations,
}: MobileGroupsTabsProps) {
  const { pathname } = useLocation();

  const tabs = [
    {
      id: 'my-groups' as const,
      label: 'My Groups',
      icon: UsersRound,
      iconSize: 16,
      getActivePath: () => pathname.startsWith(paths.GROUPS(null)),
    },
    {
      id: 'listeners' as const,
      label: 'Listeners',
      icon: Headphones,
      iconSize: 20,
      getActivePath: () => pathname.startsWith(paths.LISTENERS(null)),
    },
    {
      id: 'library' as const,
      label: 'Library',
      icon: Music2,
      iconSize: 20,
      getActivePath: () => pathname === paths.LIBRARY,
    },
    {
      id: 'inbox' as const,
      label: 'Inbox',
      icon: Inbox,
      iconSize: 20,
      getActivePath: () => pathname === paths.INBOX,
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: User,
      iconSize: 20,
      getActivePath: () => pathname === paths.PROFILE,
    },
  ];

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[49] max-w-screen-sm mx-auto',
        'bg-white dark:bg-dark-bg',
        'border-t-2 rounded-t-2xl dark:border-zinc-700',
        'pb-safe',
        className
      )}
    >
      <div className="flex items-center justify-around h-16 p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.getActivePath();

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1',
                'flex-1 h-full',
                'transition-colors duration-200',
                'text-zinc-400 dark:text-zinc-400',
                isActive && 'text-light-text dark:text-dark-text'
              )}
            >
              <div className="relative">
                <Icon
                  size={tab.iconSize}
                  className={cn(
                    'transition-all duration-200',
                    isActive && 'scale-110 text-primary-600'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {tab.id === 'inbox' && !!countInvitations && countInvitations > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 text-[9px] bg-emerald-500 dark:bg-emerald-600 text-white rounded-full w-4 h-4 flex items-center justify-center sm:text-xs font-bold transition-all duration-200">
                    {countInvitations}
                  </span>
                )}
              </div>

              <span
                className={cn(
                  'text-[10px] sm:text-xs font-medium transition-all duration-200',
                  isActive && 'font-semibold text-primary-600'
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
