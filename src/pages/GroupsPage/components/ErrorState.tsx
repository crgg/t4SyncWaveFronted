import { Button } from '@shared/components/Button/Button';

interface ErrorStateProps {
  error: Error | unknown;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="text-6xl">😕</div>
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
            Failed to load groups
          </h3>
          <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md">
            {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
          </p>
          <Button onClick={onRetry} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
