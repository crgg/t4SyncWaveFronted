import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Music, Copy, Play, Clock, Plus, MoveRight } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';

import { groupsApi } from '@/features/groups/groupsApi';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { cn } from '@shared/utils';
import { Button } from '@shared/components/Button/Button';
import { CreateGroupModal } from '@/features/groups/components/CreateGroupModal';
import type { Group } from '@/features/groups/groups.types';
import { layoutActions } from '@/app/slices/layoutSlice';

const GroupsPage = () => {
  const activeTab = useAppSelector((state) => state.layout.activeTab);
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    data: dataMyGroups,
    isLoading: isLoadingMyGroups,
    error: errorMyGroups,
    refetch: refetchMyGroups,
  } = useQuery({
    queryKey: ['groups', { userId }],
    queryFn: () => groupsApi.getGroups(),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 5,
  });

  const {
    data: dataOthersGroups,
    isLoading: isLoadingOthersGroups,
    error: errorOthersGroups,
    refetch: refetchOthersGroups,
  } = useQuery({
    queryKey: ['others-groups', { userId }],
    queryFn: () => groupsApi.getOthersGroups(),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 5,
  });

  const isMyGroups = activeTab === 'my-groups';

  const groups = dataMyGroups?.status && dataMyGroups?.groups ? dataMyGroups.groups : [];
  const othersGroups =
    dataOthersGroups?.status && dataOthersGroups?.groups ? dataOthersGroups.groups : [];
  const myGroups = groups.filter((group) => group.created_by === userId);
  const displayedGroups = isMyGroups ? myGroups : othersGroups;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isLoadingMyGroups || isLoadingOthersGroups) {
    return (
      <div className="w-full max-w-4xl mx-auto pb-24">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Loading groups...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMyGroups || errorOthersGroups) {
    return (
      <div className="w-full max-w-4xl mx-auto pb-24">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="text-6xl">😕</div>
            <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
              Failed to load groups
            </h3>
            <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md">
              {errorMyGroups instanceof Error
                ? errorMyGroups.message
                : 'Something went wrong. Please try again.'}
            </p>
            <Button
              onClick={() => (isMyGroups ? refetchMyGroups() : refetchOthersGroups())}
              variant="primary"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (displayedGroups.length === 0) {
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
                onClick={() => setIsCreateModalOpen(true)}
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
                    navigate('/groups/me');
                    dispatch(layoutActions.setActiveTab('my-groups'));
                  }}
                >
                  Go to my groups
                </Button>
              </div>
            )}
          </motion.div>
        </div>
        <CreateGroupModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            // Opcional: mostrar notificación o hacer scroll al nuevo grupo
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-light-text dark:text-dark-text">
            {isMyGroups ? 'My Groups' : 'All Groups'}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {displayedGroups.length} {displayedGroups.length === 1 ? 'group' : 'groups'}
            </span>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="primary"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Create Group</span>
            </Button>
          </div>
        </div>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          {isMyGroups ? 'Groups you created' : 'Discover and join music groups'}
        </p>
      </motion.div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedGroups.map((group, index) => (
          <GroupCard
            key={group.id}
            group={group}
            index={index}
            copiedCode={copiedCode}
            onCopyCode={handleCopyCode}
            isMyGroups={isMyGroups}
            onDblClick={() => navigate(`/groups${isMyGroups ? '/me' : ''}/${group.id}`)}
          />
        ))}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          toast.success('Group created successfully');
        }}
      />
    </div>
  );
};

interface GroupCardProps {
  group: Group;
  index: number;
  copiedCode: string | null;
  onCopyCode: (code: string) => void;
  isMyGroups: boolean;
  onDblClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const GroupCard = ({ group, copiedCode, onCopyCode, isMyGroups, onDblClick }: GroupCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.detail === 2) {
      onDblClick(e);
    }
  };

  return (
    <div
      className={cn(
        'group relative p-2 rounded-xl',
        'bg-light-card dark:bg-dark-card',
        'border border-light-hover dark:border-dark-hover',
        'hover:border-primary-600/30 dark:hover:border-primary-600/30',
        'hover:shadow-lg transition-all duration-200',
        'cursor-pointer'
      )}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {group.name.charAt(0).toUpperCase()}
          </div>

          {/* Name and Creator */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-light-text dark:text-dark-text truncate text-lg">
              {group.name}
            </h3>
            {!isMyGroups && (
              <div className="flex items-center gap-2 mt-1">
                <Users
                  size={14}
                  className="text-light-text-secondary dark:text-dark-text-secondary"
                />
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary truncate">
                  {group.created_by_name || 'Unknown'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        {group.is_active && !isMyGroups && (
          <div className="flex-shrink-0 hide">
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30">
              Active
            </span>
          </div>
        )}
      </div>

      {/* Playing Status */}
      {group.is_playing && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-primary-600/10 border border-primary-600/20">
          <div className="relative">
            <Play size={16} className="text-primary-600" fill="currentColor" />
            <div className="absolute inset-0 bg-primary-600/20 rounded-full animate-ping" />
          </div>
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
            Now Playing
          </span>
          {group.current_time_ms > 0 && (
            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary ml-auto">
              {formatTime(group.current_time_ms)}
            </span>
          )}
        </div>
      )}

      {/* Code Section */}
      {group.code && (
        <div className="mb-3 p-3 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-hover dark:border-dark-hover">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Copy
                size={14}
                className="text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0"
              />
              <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                Code:
              </span>
              <code className="font-mono font-semibold text-sm text-light-text dark:text-dark-text truncate">
                {group.code}
              </code>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyCode(group.code);
              }}
              className={cn(
                'flex-shrink-0 px-2 py-1 text-xs rounded',
                'transition-colors',
                copiedCode === group.code
                  ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                  : 'bg-light-hover dark:bg-dark-hover hover:bg-primary-600/20 text-light-text-secondary dark:text-dark-text-secondary hover:text-primary-600'
              )}
            >
              {copiedCode === group.code ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary pt-3 border-t border-light-hover dark:border-dark-hover">
        <div className="flex items-center gap-1 justify-between w-full">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>Created {formatDate(group.created_at)}</span>
          </div>
          <Link
            to={isMyGroups ? `/groups/me/${group.id}` : `/groups/${group.id}`}
            className="inline-flex items-center gap-1 text-light-text-secondary dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-400 underline underline-offset-4"
          >
            <span>Go to group</span> <MoveRight size={12} />
          </Link>
        </div>
        {group.current_track_id && (
          <div className="flex items-center gap-1">
            <Music size={12} />
            <span>Track playing</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupsPage;
