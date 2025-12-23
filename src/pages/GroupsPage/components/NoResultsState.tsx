import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Search } from 'lucide-react';

import { Button } from '@shared/components/Button/Button';
import { GroupsPageHeader } from './GroupsPageHeader';
import { SearchAndSortControls } from './SearchAndSortControls';
import { CreateGroupModal } from '@/features/groups/components/CreateGroupModal';
import type { SortOption } from '../types';

interface NoResultsStateProps {
  isMyGroups: boolean;
  searchQuery: string;
  sortBy: SortOption;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: SortOption) => void;
  onCreateGroup: () => void;
  isCreateModalOpen: boolean;
  onCloseCreateModal: () => void;
}

export function NoResultsState({
  isMyGroups,
  searchQuery,
  sortBy,
  onSearchChange,
  onSortChange,
  onCreateGroup,
  isCreateModalOpen,
  onCloseCreateModal,
}: NoResultsStateProps) {
  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      <GroupsPageHeader isMyGroups={isMyGroups} groupsCount={0} onCreateGroup={onCreateGroup} />
      <SearchAndSortControls
        searchQuery={searchQuery}
        sortBy={sortBy}
        onSearchChange={onSearchChange}
        onSortChange={onSortChange}
        resultsCount={0}
      />

      <div className="flex items-center justify-center min-h-[40vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="text-6xl">
            <Search size={64} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
            No groups found
          </h3>
          <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md">
            {searchQuery
              ? `No groups match your search "${searchQuery}". Try adjusting your search terms.`
              : 'Try adjusting your filters to see more groups.'}
          </p>
          {searchQuery && (
            <Button onClick={() => onSearchChange('')} variant="outline" className="mt-4">
              Clear Search
            </Button>
          )}
        </motion.div>
      </div>

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={onCloseCreateModal}
        onSuccess={() => {
          toast.success('Group created successfully');
        }}
      />
    </div>
  );
}
