import {
  Users,
  Music,
  Copy,
  Play,
  Clock,
  MoveRight,
  MoreVertical,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@shared/utils';
import { Dropdown } from '@shared/components/Dropdown/Dropdown';
import type { Group } from '@/features/groups/groups.types';
import { paths } from '@/routes/paths';

interface GroupCardProps {
  group: Group;
  copiedCode: string | null;
  onCopyCode: (code: string) => void;
  isMyGroups: boolean;
  onDblClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function GroupCard({
  group,
  copiedCode,
  onCopyCode,
  isMyGroups,
  onDblClick,
  onEdit,
  onDelete,
}: GroupCardProps) {
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
        'hover:border-primary-600/30 dark:hover:border-primary-600/50',
        'hover:shadow-lg transition-all duration-200',
        'cursor-pointer'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {group.name.charAt(0).toUpperCase()}
          </div>

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

        <div className="flex items-center gap-2 flex-shrink-0">
          {group.is_active && !isMyGroups && (
            <div className="flex-shrink-0">
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30">
                Active
              </span>
            </div>
          )}
          {isMyGroups && (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown>
                <Dropdown.Trigger className="p-1.5 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition-colors">
                  <MoreVertical
                    size={18}
                    className="text-light-text-secondary dark:text-dark-text-secondary"
                  />
                </Dropdown.Trigger>
                <Dropdown.Menu className="right-0 mt-1">
                  <Dropdown.Item onClick={onEdit} className="flex items-center gap-2">
                    <Edit2 size={16} />
                    <span>Edit Group</span>
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={onDelete}
                    className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 size={16} />
                    <span>Delete Group</span>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          )}
        </div>
      </div>

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

      <div className="flex items-center justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary pt-3 border-t border-light-hover dark:border-dark-hover">
        <div className="flex items-center gap-1 justify-between w-full">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>Created {formatDate(group.created_at)}</span>
          </div>
          <Link
            to={isMyGroups ? paths.GROUPS(`/${group.id}`) : paths.LISTENERS(`/${group.id}`)}
            className="inline-flex items-center gap-1 text-light-text-secondary dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:underline underline-offset-4"
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
}
