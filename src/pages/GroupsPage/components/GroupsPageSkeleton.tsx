import { Skeleton } from '@shared/components/Skeleton/Skeleton';
import { GroupCardSkeleton } from './GroupCardSkeleton';

interface GroupsPageSkeletonProps {
  isMyGroups?: boolean;
}

export function GroupsPageSkeleton({ isMyGroups = true }: GroupsPageSkeletonProps) {
  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Skeleton variant="text" height={36} width={200} />
          <div className="flex items-center gap-3">
            <Skeleton variant="text" height={16} width={80} />
            {isMyGroups && (
              <Skeleton variant="rectangular" width={140} height={36} className="rounded" />
            )}
          </div>
        </div>
        <Skeleton variant="text" height={16} width={300} />
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Skeleton variant="rectangular" height={40} className="flex-1 rounded-lg" />
        <Skeleton variant="rectangular" height={40} width={160} className="rounded-lg" />
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <GroupCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
