import { motion } from 'framer-motion';
import { Headphones, Plus, UsersRound } from 'lucide-react';
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
          <div className="text-6xl">
            {!isMyGroups ? (
              <Headphones
                className="text-light-text-secondary dark:text-dark-text-secondary mx-auto"
                size={64}
              />
            ) : (
              <UsersRound
                className="text-light-text-secondary dark:text-dark-text-secondary mx-auto"
                size={64}
              />
            )}
          </div>
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
            No Groups Yet
          </h3>
          <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md">
            {isMyGroups
              ? 'Create your first DJ group and start syncing music'
              : 'jin a group with a code to start listening with friends!'}
          </p>
          {isMyGroups ? (
            <Button
              onClick={onCreateGroup}
              variant="primary"
              className="mt-4 flex items-center gap-2 mx-auto text-sm"
            >
              <Plus size={18} />
              Create Your First Group
            </Button>
          ) : (
            <div className="mt-4 inline-flex items-center gap-2 mx-auto">
              <Button
                variant="primary"
                className="text-sm"
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
