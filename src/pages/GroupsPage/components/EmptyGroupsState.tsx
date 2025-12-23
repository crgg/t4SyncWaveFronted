import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@shared/components/Button/Button';
import { CreateGroupModal } from '@/features/groups/components/CreateGroupModal';
import { layoutActions } from '@/app/slices/layoutSlice';
import { useAppDispatch } from '@/app/hooks';
import { paths } from '@/routes/paths';

interface EmptyGroupsStateProps {
  isMyGroups: boolean;
  onCreateGroup: () => void;
  isCreateModalOpen: boolean;
  onCloseCreateModal: () => void;
}

export function EmptyGroupsState({
  isMyGroups,
  onCreateGroup,
  isCreateModalOpen,
  onCloseCreateModal,
}: EmptyGroupsStateProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="text-6xl">🎵</div>
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
            {isMyGroups ? "You haven't created any groups yet" : 'No groups available'}
          </h3>
          <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md">
            {isMyGroups
              ? 'Create your first group to start syncing music with friends!'
              : 'Be the first to create a group and start sharing music!'}
          </p>
          {isMyGroups ? (
            <Button
              onClick={onCreateGroup}
              variant="primary"
              className="mt-4 flex items-center gap-2 mx-auto"
            >
              <Plus size={18} />
              Create Your First Group
            </Button>
          ) : (
            <div className="mt-4 inline-flex items-center gap-2 mx-auto">
              <Button
                variant="primary"
                onClick={() => {
                  navigate(paths.GROUPS(null));
                  dispatch(layoutActions.setActiveTab('my-groups'));
                }}
              >
                Go to my groups
              </Button>
            </div>
          )}
        </motion.div>
      </div>
      <CreateGroupModal isOpen={isCreateModalOpen} onClose={onCloseCreateModal} />
    </div>
  );
}
