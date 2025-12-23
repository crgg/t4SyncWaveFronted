import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@shared/components/Button/Button';

interface GroupsPageHeaderProps {
  isMyGroups: boolean;
  groupsCount: number;
  onCreateGroup: () => void;
}

export function GroupsPageHeader({
  isMyGroups,
  groupsCount,
  onCreateGroup,
}: GroupsPageHeaderProps) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-light-text dark:text-dark-text">
          {isMyGroups ? 'My Groups' : 'All Groups'}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {groupsCount} {groupsCount === 1 ? 'group' : 'groups'}
          </span>
          {isMyGroups && (
            <Button
              onClick={onCreateGroup}
              variant="primary"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Create Group</span>
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
        {isMyGroups ? 'Groups you created' : 'Discover and join music groups'}
      </p>
    </motion.div>
  );
}
