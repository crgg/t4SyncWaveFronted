import { Skeleton } from '@shared/components/Skeleton/Skeleton';

export function GroupPageSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      {/* Back Button */}
      <div className="mb-4 mt-2">
        <Skeleton variant="rectangular" height={24} width={120} className="rounded" />
      </div>

      {/* Group Header Card */}
      <div className="mb-6">
        <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-xl border border-light-hover dark:border-dark-hover p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Skeleton variant="rectangular" width={64} height={64} className="rounded-xl" />
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton variant="text" height={32} width="60%" />
                  <Skeleton variant="circular" width={20} height={20} />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton
                    variant="rectangular"
                    width={100}
                    height={24}
                    className="rounded-full"
                  />
                  <Skeleton variant="rectangular" width={90} height={24} className="rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-hover dark:border-dark-hover"
          >
            <div className="flex items-center gap-3">
              <Skeleton variant="rectangular" width={40} height={40} className="rounded-lg" />
              <div className="space-y-2">
                <Skeleton variant="text" height={14} width={60} />
                <Skeleton variant="text" height={24} width={40} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members Section */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-xl border border-light-hover dark:border-dark-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="text" height={24} width={150} />
            <Skeleton variant="circular" width={32} height={32} />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-hover dark:border-dark-hover"
              >
                <Skeleton variant="circular" width={40} height={40} />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton variant="text" height={16} width="70%" />
                  <Skeleton variant="text" height={12} width="50%" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tracks Section */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-xl border border-light-hover dark:border-dark-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="text" height={24} width={150} />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg bg-light-surface dark:bg-dark-surface"
              >
                <Skeleton variant="rectangular" width={40} height={40} className="rounded" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton variant="text" height={16} width="80%" />
                  <Skeleton variant="text" height={12} width="60%" />
                </div>
                <Skeleton variant="text" height={14} width={50} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Group Information Section */}
      <div className="mt-6 bg-light-card dark:bg-dark-card rounded-xl shadow-xl border border-light-hover dark:border-dark-hover p-6">
        <Skeleton variant="text" height={24} width={200} className="mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton variant="text" height={14} width={100} />
              <Skeleton variant="text" height={18} width="80%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
