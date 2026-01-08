import { cn } from '@shared/utils';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';

interface CommonProps {
  className?: string;
  fill?: string;
  viewBox?: string;
}

export const Previous = ({ className, fill, viewBox }: CommonProps) => {
  return (
    <svg
      className={cn('text-light-text-secondary dark:text-dark-text-secondary', className)}
      fill={fill || 'currentColor'}
      viewBox={viewBox || '0 0 20 20'}
    >
      <path
        fillRule="evenodd"
        d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export const Rewind = ({ className, fill, viewBox }: CommonProps) => {
  return (
    <svg
      className={cn('text-light-text-secondary dark:text-dark-text-secondary', className)}
      fill={fill || 'currentColor'}
      viewBox={viewBox || '0 0 20 20'}
    >
      <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
    </svg>
  );
};

export const Play = ({ className, fill, viewBox }: CommonProps) => {
  return (
    <svg
      className={cn('text-white', className)}
      fill={fill || 'currentColor'}
      viewBox={viewBox || '0 0 20 20'}
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export const Pause = ({ className, fill, viewBox }: CommonProps) => {
  return (
    <svg
      className={cn('text-white', className)}
      fill={fill || 'currentColor'}
      viewBox={viewBox || '0 0 20 20'}
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export const Fordward = ({ className, fill, viewBox }: CommonProps) => {
  return (
    <svg
      className={cn('text-light-text-secondary dark:text-dark-text-secondary', className)}
      fill={fill || 'currentColor'}
      viewBox={viewBox || '0 0 20 20'}
    >
      <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0011 6v2.798l-5.445-3.63z" />
    </svg>
  );
};

export const Next = ({ className, fill, viewBox }: CommonProps) => {
  return (
    <svg
      className={cn('text-light-text-secondary dark:text-dark-text-secondary', className)}
      fill={fill || 'currentColor'}
      viewBox={viewBox || '0 0 20 20'}
    >
      <path
        fillRule="evenodd"
        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
};

interface VolumenProps extends CommonProps {
  volume: number;
  muted?: boolean;
}

export const Volumen = ({ className, volume, muted }: VolumenProps) => {
  let baseClass = 'text-zinc-500 dark:text-zinc-400';

  if (muted) {
    baseClass = 'text-red-500 dark:text-red-500';
    return <VolumeX className={cn(baseClass, className)} />;
  }

  if (volume === 0) {
    return <Volume className={cn(baseClass, className)} />;
  }

  if (volume < 50) {
    return <Volume1 className={cn(baseClass, className)} />;
  }

  return <Volume2 className={cn(baseClass, className)} />;
};

export const Stop = ({ className, fill, viewBox }: CommonProps) => {
  return (
    <svg
      className={cn('text-light-text-secondary dark:text-dark-text-secondary', className)}
      fill={fill || 'currentColor'}
      viewBox={viewBox || '0 0 640 640'}
    >
      <path d="M160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160C96 124.7 124.7 96 160 96z" />
    </svg>
  );
};
