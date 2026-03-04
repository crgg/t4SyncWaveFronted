import { forwardRef, OptionHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '@shared/utils';

interface Option {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-0.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          {...props}
          className={cn(
            'w-full border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 bg-white dark:bg-dark-surface border-b border-light-hover/30 dark:border-dark-hover/30 text-light-text dark:text-dark-text placeholder-zinc-300 dark:placeholder-zinc-500 focus:outline-none focus:border-primary dark:focus:border-primary-light transition-colors',
            error && 'border-red-500'
          )}
        >
          {options.map(({ value, label }: Option) => (
            <Option key={value} value={value.toString()} label={label} />
          ))}
        </select>
      </div>
    );
  }
);

interface OptionProps extends OptionHTMLAttributes<HTMLOptionElement> {
  value: string;
  label: string;
}

const Option = ({ value, label, ...props }: OptionProps) => {
  return (
    <option value={value} {...props}>
      {label}
    </option>
  );
};

export { Select, Option };
