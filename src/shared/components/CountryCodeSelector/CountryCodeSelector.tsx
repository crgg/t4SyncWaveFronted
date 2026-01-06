import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@shared/utils';

interface Country {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

const countries: Country[] = [
  { code: 'US', dialCode: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'MX', dialCode: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: 'CA', dialCode: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'ES', dialCode: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: 'FR', dialCode: '+33', name: 'France', flag: '🇫🇷' },
  { code: 'DE', dialCode: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: 'IT', dialCode: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: 'BR', dialCode: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: 'AR', dialCode: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: 'PE', dialCode: '+51', name: 'Peru', flag: '🇵🇪' },
];

interface CountryCodeSelectorProps {
  value: string;
  onChange: (dialCode: string) => void;
  className?: string;
}

export const CountryCodeSelector = ({ value, onChange, className }: CountryCodeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedCountry = countries.find((c) => c.dialCode === value) || countries[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl h-[42px]',
          'bg-white dark:bg-dark-card',
          'border border-zinc-200 dark:border-zinc-800',
          'text-light-text dark:text-dark-text',
          'hover:border-primary dark:hover:border-primary-light',
          'focus:outline-none focus:border-primary dark:focus:border-primary-light',
          'transition-colors',
          'min-w-[60px]'
        )}
      >
        <span className="text-xl">
          {selectedCountry.flag} <span className="text-sm">{selectedCountry.dialCode}</span>
        </span>
        <ChevronDown size={16} className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            className={cn(
              'absolute top-full left-0 mt-1 z-20',
              'bg-white dark:bg-dark-card',
              'border border-zinc-200 dark:border-zinc-800',
              'rounded-lg shadow-lg',
              'max-h-60 overflow-y-auto',
              'min-w-[200px]'
            )}
          >
            {countries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => {
                  onChange(country.dialCode);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5',
                  'text-left text-sm',
                  'text-light-text dark:text-dark-text',
                  'hover:bg-light-hover dark:hover:bg-dark-hover',
                  'transition-colors',
                  selectedCountry.code === country.code && 'bg-primary/10 dark:bg-primary-light/10'
                )}
              >
                <span className="text-lg">{country.flag}</span>
                <span className="flex-1">{country.name}</span>
                <span className="text-zinc-500 dark:text-zinc-400">{country.dialCode}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
