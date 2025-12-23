export function LoadingState() {
  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Loading groups...
          </p>
        </div>
      </div>
    </div>
  );
}
