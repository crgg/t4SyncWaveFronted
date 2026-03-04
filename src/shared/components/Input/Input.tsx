import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@shared/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  buttonEnd?: React.ReactNode;
  classNameWrapper?: string;
  countCharacters?: boolean;
  description?: string;
  id?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, buttonEnd, classNameWrapper, countCharacters = false, id, ...props },
    ref
  ) => {
    const maxLength = (props.maxLength as number) || 0;

    return (
      <>
        <div className="w-full">
          {label && (
            <label
              htmlFor={id}
              className="block text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-0.5"
            >
              {label}
            </label>
          )}
          <div className={cn('flex', classNameWrapper)}>
            <input
              ref={ref}
              id={id}
              className={cn(
                'w-full border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 bg-white dark:bg-dark-surface border-b border-light-hover/30 dark:border-dark-hover/30 text-light-text dark:text-dark-text placeholder-zinc-400 dark:placeholder-zinc-500 placeholder:transition-all placeholder:duration-200 focus:placeholder:translate-x-2 focus:outline-none focus:border-blue-500 dark:focus:border-blue-700 transition-colors',
                error && 'border-red-500',
                className
              )}
              {...props}
            />
            {buttonEnd}
          </div>
          {(countCharacters || error) && (
            <div className="flex items-center justify-between">
              {error && <p className="text-[12px] text-red-500 dark:text-red-400">{error}</p>}
              {countCharacters && (
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 text-end ms-auto">
                  {(props.value as string)?.length ?? 0}/{maxLength} Characters
                </p>
              )}
            </div>
          )}
        </div>
      </>
    );
  }
);

Input.displayName = 'Input';
