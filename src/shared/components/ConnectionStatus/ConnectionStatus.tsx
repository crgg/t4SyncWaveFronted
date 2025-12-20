import { CheckCircle2, XCircle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import { useAppSelector } from '@app/hooks';

export function ConnectionStatus() {
  const { isConnected, lastError } = useAppSelector((state) => state.connection);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={twMerge(
          'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30',
          isConnected
            ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
        )}
      >
        {isConnected && <CheckCircle2 size={12} />}
        {!isConnected && <XCircle size={12} />}
        {isConnected ? 'Active' : 'Inactive'}
      </span>
      {lastError && <span className="text-red-400 text-xs">({lastError})</span>}
    </div>
  );
}
