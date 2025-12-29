import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

import { groupsApi } from '@/features/groups/groupsApi';
import { useAppSelector } from '@/app/hooks';
import { CreateGroupModal } from '@/features/groups/components/CreateGroupModal';
import { EditGroupModal } from '@/features/groups/components/EditGroupModal';
import { DeleteGroupModal } from '@/features/groups/components/DeleteGroupModal';
import type { Group } from '@/features/groups/groups.types';
import DeleteDialog from '@/shared/components/DeleteDialog/DeleteDialog';

import { GroupsPageHeader } from './GroupsPage/components/GroupsPageHeader';
import { SearchAndSortControls } from './GroupsPage/components/SearchAndSortControls';
import { GroupsPageSkeleton } from './GroupsPage/components/GroupsPageSkeleton';
import { ErrorState } from './GroupsPage/components/ErrorState';
import { EmptyGroupsState } from './GroupsPage/components/EmptyGroupsState';
import { NoResultsState } from './GroupsPage/components/NoResultsState';
import { GroupCard } from './GroupsPage/components/GroupCard';
import { JoinGroupByCode } from './GroupsPage/components/JoinGroupByCode';
import type { SortOption } from './GroupsPage/types';
import { paths } from '@/routes/paths';

const GroupsPage = () => {
  const activeTab = useAppSelector((state) => state.layout.activeTab);
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [leavingGroup, setLeavingGroup] = useState<Group | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
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
  const baseGroups = isMyGroups ? myGroups : othersGroups;

  const displayedGroups = useMemo(() => {
    let filtered = baseGroups;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = baseGroups.filter(
        (group) =>
          group.name.toLowerCase().includes(query) ||
          group.code?.toLowerCase().includes(query) ||
          group.created_by_name?.toLowerCase().includes(query)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [baseGroups, searchQuery, sortBy]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isLoadingMyGroups || isLoadingOthersGroups) {
    return <GroupsPageSkeleton isMyGroups={isMyGroups} />;
  }

  if (errorMyGroups || errorOthersGroups) {
    return (
      <ErrorState
        error={errorMyGroups || errorOthersGroups}
        onRetry={() => (isMyGroups ? refetchMyGroups() : refetchOthersGroups())}
      />
    );
  }

  if (baseGroups.length === 0) {
    return (
      <>
        <div className="w-full">{!isMyGroups && <JoinGroupByCode userId={userId} />}</div>
        <EmptyGroupsState
          isMyGroups={isMyGroups}
          onCreateGroup={() => setIsCreateModalOpen(true)}
          isCreateModalOpen={isCreateModalOpen}
          onCloseCreateModal={() => setIsCreateModalOpen(false)}
        />
      </>
    );
  }

  if (displayedGroups.length === 0 && (searchQuery || sortBy !== 'newest')) {
    return (
      <NoResultsState
        isMyGroups={isMyGroups}
        searchQuery={searchQuery}
        sortBy={sortBy}
        onSearchChange={setSearchQuery}
        onSortChange={setSortBy}
        onCreateGroup={() => setIsCreateModalOpen(true)}
        isCreateModalOpen={isCreateModalOpen}
        onCloseCreateModal={() => setIsCreateModalOpen(false)}
        userId={userId}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      <GroupsPageHeader
        isMyGroups={isMyGroups}
        groupsCount={displayedGroups.length}
        onCreateGroup={() => setIsCreateModalOpen(true)}
      />

      {!isMyGroups && <JoinGroupByCode userId={userId} />}

      <SearchAndSortControls
        searchQuery={searchQuery}
        sortBy={sortBy}
        onSearchChange={setSearchQuery}
        onSortChange={setSortBy}
        resultsCount={displayedGroups.length}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedGroups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            copiedCode={copiedCode}
            onCopyCode={handleCopyCode}
            isMyGroups={isMyGroups}
            onDblClick={() =>
              navigate(isMyGroups ? paths.GROUPS(`/${group.id}`) : paths.LISTENERS(`/${group.id}`))
            }
            onEdit={() => setEditingGroup(group)}
            onDelete={() => setDeletingGroup(group)}
            onLeaveGroup={
              !isMyGroups
                ? () => {
                    setLeavingGroup(group);
                    refetchOthersGroups();
                  }
                : undefined
            }
          />
        ))}
      </div>

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          toast.success('Group created successfully');
        }}
      />

      {editingGroup && (
        <EditGroupModal
          isOpen={!!editingGroup}
          onClose={() => setEditingGroup(null)}
          groupId={editingGroup.id}
          currentName={editingGroup.name}
          onSuccess={() => {
            toast.success('Group updated successfully');
            setEditingGroup(null);
          }}
        />
      )}

      {deletingGroup && (
        <DeleteGroupModal
          isOpen={!!deletingGroup}
          onClose={() => setDeletingGroup(null)}
          groupId={deletingGroup.id}
          groupName={deletingGroup.name}
          onSuccess={() => {
            toast.success('Group deleted successfully');
            setDeletingGroup(null);
          }}
        />
      )}

      {leavingGroup && (
        <DeleteDialog
          modelNameValue={leavingGroup.name}
          mutationFn={groupsApi.leaveGroup}
          onClose={() => setLeavingGroup(null)}
          queryKeys={[['others-groups', { userId }]]}
          isOpen={!!leavingGroup}
          payload={{ groupId: leavingGroup.id }}
          modelName="group"
          onSuccess={() => {
            toast.success('Successfully left the group');
            setLeavingGroup(null);
          }}
        />
      )}
    </div>
  );
};

export default GroupsPage;
