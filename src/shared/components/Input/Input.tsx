/**
 * Componente Input reutilizable
 */

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@shared/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-dark-text-secondary mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2 bg-dark-surface border border-dark-hover rounded-lg text-dark-text placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent',
            error && 'border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

