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
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-light-text dark:text-dark-text">
            {isMyGroups ? 'My Groups' : 'All Groups'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-300">
            {isMyGroups ? 'Groups you created' : 'Discover and join music groups'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400 dark:text-zinc-300 hidden sm:inline">
            {groupsCount} {groupsCount === 1 ? 'group' : 'groups'}
          </span>
          {isMyGroups && (
            <Button
              onClick={onCreateGroup}
              variant="outline-primary"
              className="flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={2} />
              <span className="hidden sm:inline">Create</span>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
