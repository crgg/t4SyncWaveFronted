import { Search, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRef, useEffect } from 'react';
import { cn } from '@shared/utils';
import { Input } from '@shared/components/Input/Input';
import { Dropdown } from '@shared/components/Dropdown/Dropdown';
import type { SortOption } from '../types';

interface SearchAndSortControlsProps {
  searchQuery: string;
  sortBy: SortOption;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: SortOption) => void;
  resultsCount?: number;
}

const sortLabels: Record<SortOption, string> = {
  newest: 'Newest First',
  oldest: 'Oldest First',
  'name-asc': 'Name A-Z',
  'name-desc': 'Name Z-A',
};

export function SearchAndSortControls({
  searchQuery,
  sortBy,
  onSearchChange,
  onSortChange,
  resultsCount,
}: SearchAndSortControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wasFocusedRef = useRef(false);

  // Mantener el foco después de re-renders
  useEffect(() => {
    if (wasFocusedRef.current && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
      // Mantener la posición del cursor al final del texto
      const length = inputRef.current.value.length;
      inputRef.current.setSelectionRange(length, length);
    }
  });

  const handleFocus = () => {
    wasFocusedRef.current = true;
  };

  const handleBlur = () => {
    wasFocusedRef.current = false;
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-2">
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary"
          />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="pl-10 pr-2"
            maxLength={50}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-light-hover/50 dark:hover:bg-dark-hover/50 transition-colors"
              aria-label="Clear search"
            >
              <X size={16} className="text-light-text-secondary dark:text-dark-text-secondary" />
            </button>
          )}
        </div>

        <Dropdown>
          <Dropdown.Trigger className="px-4 py-2.5 flex items-center gap-2 min-w-[160px] justify-between border dark:bg-dark-surface border-b border-light-hover dark:border-dark-hover/30 text-light-text dark:text-dark-text hover:border-primary dark:hover:border-primary-light transition-colors">
            <div className="flex items-center gap-2">
              <ArrowUpDown
                size={16}
                className="text-light-text-secondary dark:text-dark-text-secondary"
              />
              <span className="text-sm font-medium">{sortLabels[sortBy]}</span>
            </div>
          </Dropdown.Trigger>
          <Dropdown.Menu className="right-0 top-full mt-1 w-48">
            <Dropdown.Item
              onClick={() => onSortChange('newest')}
              className={cn(
                'flex items-center gap-2',
                sortBy === 'newest' &&
                  'bg-primary/10 dark:bg-primary-light/10 text-primary dark:text-primary-light'
              )}
            >
              <ArrowDown size={16} />
              <span>Newest First</span>
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => onSortChange('oldest')}
              className={cn(
                'flex items-center gap-2',
                sortBy === 'oldest' &&
                  'bg-primary/10 dark:bg-primary-light/10 text-primary dark:text-primary-light'
              )}
            >
              <ArrowUp size={16} />
              <span>Oldest First</span>
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => onSortChange('name-asc')}
              className={cn(
                'flex items-center gap-2',
                sortBy === 'name-asc' &&
                  'bg-primary/10 dark:bg-primary-light/10 text-primary dark:text-primary-light'
              )}
            >
              <span>A-Z</span>
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => onSortChange('name-desc')}
              className={cn(
                'flex items-center gap-2',
                sortBy === 'name-desc' &&
                  'bg-primary/10 dark:bg-primary-light/10 text-primary dark:text-primary-light'
              )}
            >
              <span>Z-A</span>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      {searchQuery && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm text-light-text-secondary dark:text-dark-text-secondary"
        >
          {resultsCount === 0 ? (
            <span>No groups found matching &quot;{searchQuery}&quot;</span>
          ) : (
            <span>
              Found {resultsCount} {resultsCount === 1 ? 'group' : 'groups'} matching &quot;
              {searchQuery}&quot;
            </span>
          )}
        </motion.div>
      )}
    </>
  );
}
