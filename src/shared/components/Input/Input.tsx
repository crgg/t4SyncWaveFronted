import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@shared/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  buttonEnd?: React.ReactNode;
  classNameWrapper?: string;
  countCharacters?: boolean;
  description?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      buttonEnd,
      classNameWrapper,
      countCharacters = false,
      description,
      ...props
    },
    ref
  ) => {
    const maxLength = (props.maxLength as number) || 0;

    return (
      <>
        <div className="w-full">
          {label && (
            <label className="block text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-0.5">
              {label}
            </label>
          )}
          <div className={cn('flex', classNameWrapper)}>
            <input
              ref={ref}
              className={cn(
                'w-full border border-zinc-200 dark:border-zinc-800 rounded px-4 py-2.5 bg-white dark:bg-dark-surface border-b border-light-hover/30 dark:border-dark-hover/30 text-light-text dark:text-dark-text placeholder-zinc-300 dark:placeholder-zinc-500 focus:outline-none focus:border-primary dark:focus:border-primary-light transition-colors',
                error && 'border-red-500',
                className
              )}
              {...props}
            />
            {buttonEnd}
          </div>
          {description && (
            <div className="text-xs text-zinc-400 dark:text-zinc-400">{description}</div>
          )}
          {countCharacters && (
            <div className="flex items-center justify-end mt-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {(props.value as string)?.length ?? 0}/{maxLength} Characters
              </p>
            </div>
          )}
          {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
        </div>
      </>
    );
  }
);

Input.displayName = 'Input';
