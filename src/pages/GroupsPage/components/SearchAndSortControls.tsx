import { Search, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { motion } from 'framer-motion';
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
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary"
          />
          <Input
            type="text"
            placeholder="Search groups by name, code, or creator..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
              aria-label="Clear search"
            >
              <X size={16} className="text-light-text-secondary dark:text-dark-text-secondary" />
            </button>
          )}
        </div>

        <Dropdown>
          <Dropdown.Trigger className="px-4 py-2 flex items-center gap-2 min-w-[160px] justify-between bg-light-surface dark:bg-dark-surface border border-light-hover dark:border-dark-hover rounded-lg text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover transition-colors">
            <div className="flex items-center gap-2">
              <ArrowUpDown
                size={16}
                className="text-light-text-secondary dark:text-dark-text-secondary"
              />
              <span className="text-sm font-medium">{sortLabels[sortBy]}</span>
            </div>
          </Dropdown.Trigger>
          <Dropdown.Menu className="right-0 mt-1 w-48">
            <Dropdown.Item
              onClick={() => onSortChange('newest')}
              className={cn(
                'flex items-center gap-2',
                sortBy === 'newest' && 'bg-primary-600/10 text-primary-600 dark:text-primary-400'
              )}
            >
              <ArrowDown size={16} />
              <span>Newest First</span>
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => onSortChange('oldest')}
              className={cn(
                'flex items-center gap-2',
                sortBy === 'oldest' && 'bg-primary-600/10 text-primary-600 dark:text-primary-400'
              )}
            >
              <ArrowUp size={16} />
              <span>Oldest First</span>
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => onSortChange('name-asc')}
              className={cn(
                'flex items-center gap-2',
                sortBy === 'name-asc' && 'bg-primary-600/10 text-primary-600 dark:text-primary-400'
              )}
            >
              <span>A-Z</span>
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => onSortChange('name-desc')}
              className={cn(
                'flex items-center gap-2',
                sortBy === 'name-desc' && 'bg-primary-600/10 text-primary-600 dark:text-primary-400'
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
