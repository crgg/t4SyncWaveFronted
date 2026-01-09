import { Copy, MoreVertical, Edit2, Trash2, Disc3 } from 'lucide-react';

import type { Group } from '@/features/groups/groups.types';

import { Dropdown } from '@shared/components/Dropdown/Dropdown';
import { cn } from '@shared/utils';

interface GroupCardProps {
  group: Group;
  copiedCode: string | null;
  onCopyCode: (code: string) => void;
  isMyGroups: boolean;
  onDblClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onEdit: () => void;
  onDelete: () => void;
  onLeaveGroup?: () => void;
}

export function GroupCard({
  group,
  onCopyCode,
  isMyGroups,
  onDblClick,
  onEdit,
  onDelete,
  onLeaveGroup,
}: GroupCardProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onDblClick(e);
  };

  return (
    <div
      className={cn(
        'border rounded-lg bg-light-card dark:bg-dark-card dark:border-dark-hover relative p-4 pb-3',
        'hover:border-primary/50',
        'transition-all duration-200',
        'cursor-pointer'
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary-light/10 flex items-center justify-center">
            <span className="text-primary dark:text-primary-light font-semibold text-base">
              {group.name.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-light-text dark:text-dark-text truncate text-base">
              {group.name}
            </h3>
            {group.code && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-xs text-light-text-secondary dark:text-zinc-400">
                    Code:
                  </span>
                  <code className="font-mono text-xs text-light-text dark:text-zinc-400 truncate">
                    {group.code}
                  </code>
                </div>
              </div>
            )}
            {!isMyGroups && (
              <div className="flex items-center gap-1 mt-1">
                <Disc3 size={13} className="text-zinc-400 dark:text-zinc-500" />
                <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                  {group.created_by_name || 'Unknown'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div onClick={(e) => e.stopPropagation()}>
            <Dropdown>
              <Dropdown.Trigger className="p-1.5 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition-colors">
                <MoreVertical
                  size={18}
                  className="text-light-text-secondary dark:text-dark-text-secondary"
                />
              </Dropdown.Trigger>
              <Dropdown.Menu className="right-0 mt-1">
                {isMyGroups ? (
                  <>
                    <Dropdown.Item onClick={onEdit} className="flex items-center gap-2">
                      <Edit2 size={16} />
                      <span>Edit Group</span>
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => onCopyCode(group.code)}
                      className="flex items-center gap-2 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                    >
                      <Copy size={16} />
                      <span>Copy Code</span>
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={onDelete}
                      className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={16} />
                      <span>Delete Group</span>
                    </Dropdown.Item>
                  </>
                ) : (
                  <>
                    <Dropdown.Item
                      onClick={() => onCopyCode(group.code)}
                      className="flex items-center gap-2 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                    >
                      <Copy size={16} />
                      <span>Copy Code</span>
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={onLeaveGroup}
                      className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={16} />
                      <span>Leave Group</span>
                    </Dropdown.Item>
                  </>
                )}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
      </div>
    </div>
  );
}
