import { Music } from 'lucide-react';

export function LibraryPageSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-32 bg-light-surface dark:bg-dark-surface rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-light-surface dark:bg-dark-surface rounded animate-pulse" />
        </div>
        <div className="h-10 w-24 bg-light-surface dark:bg-dark-surface rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-3 rounded-lg bg-light-surface dark:bg-dark-surface animate-pulse"
          >
            <Music size={20} className="text-light-text-secondary dark:text-dark-text-secondary" />
            <div className="flex-1">
              <div className="h-4 bg-light-text-secondary dark:bg-dark-text-secondary rounded w-3/4 mb-2" />
              <div className="h-3 bg-light-text-secondary dark:bg-dark-text-secondary rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
