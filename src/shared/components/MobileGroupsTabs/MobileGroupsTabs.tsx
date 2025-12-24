import { AudioLines, HomeIcon, UsersRound } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import type { LayoutState } from '@/app/slices/layoutSlice';
import { paths } from '@/routes/paths';
import { cn } from '@shared/utils';

interface MobileGroupsTabsProps {
  activeTab?: LayoutState['activeTab'];
  onTabChange?: (tab: LayoutState['activeTab']) => void;
  className?: string;
}

export function MobileGroupsTabs({ onTabChange, className }: MobileGroupsTabsProps) {
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
      id: 'home' as const,
      label: 'Home',
      icon: HomeIcon,
      iconSize: 16,
      getActivePath: () => pathname === paths.HOME,
    },
    {
      id: 'listeners' as const,
      label: 'Listeners',
      icon: AudioLines,
      iconSize: 20,
      getActivePath: () => pathname.startsWith(paths.LISTENERS(null)),
    },
  ];

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[49] max-w-screen-sm mx-auto',
        'bg-light-bg dark:bg-dark-bg',
        'border-t border-light-hover dark:border-dark-hover',
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
                'text-light-text-secondary dark:text-dark-text-secondary',
                isActive && 'text-light-text dark:text-dark-text'
              )}
            >
              <Icon
                size={tab.iconSize}
                className={cn(
                  'transition-all duration-200',
                  isActive && 'scale-110 text-primary-600'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  'text-xs font-medium transition-all duration-200',
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
