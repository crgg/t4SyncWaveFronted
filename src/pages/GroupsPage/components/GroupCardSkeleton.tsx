import { Skeleton } from '@shared/components/Skeleton/Skeleton';

export function GroupCardSkeleton() {
  return (
    <div className="p-2 rounded-xl bg-light-card dark:bg-dark-card border border-light-hover dark:border-dark-hover">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Skeleton variant="rectangular" width={48} height={48} className="rounded-lg" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton variant="text" height={20} width="70%" />
            <Skeleton variant="text" height={16} width="50%" />
          </div>
        </div>
        <Skeleton variant="circular" width={24} height={24} />
      </div>

      <div className="mb-3 p-3 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-hover dark:border-dark-hover">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Skeleton variant="circular" width={14} height={14} />
            <Skeleton variant="text" height={12} width={40} />
            <Skeleton variant="text" height={14} width={80} />
          </div>
          <Skeleton variant="rectangular" width={50} height={24} className="rounded" />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-3 border-t border-light-hover dark:border-dark-hover">
        <Skeleton variant="text" height={12} width={120} />
        <Skeleton variant="text" height={12} width={80} />
      </div>
    </div>
  );
}
