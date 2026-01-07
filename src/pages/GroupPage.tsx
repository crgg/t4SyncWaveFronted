import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Music, ArrowLeft, Crown, UserPlus, UserMinus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { groupsApi } from '@/features/groups/groupsApi';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { store } from '@/app/store';
import { Button } from '@shared/components/Button/Button';
import { AddMemberModal } from '@/features/groups/components/AddMemberModal';
import type { DialogType, IGroupUsers, Member } from '@/features/groups/groups.types';
import { PlaylistHost } from '@/features/playlist/components/PlaylistHost';
import {
  playListSelectors,
  setCurrentTrackIndex,
  setPlaylistFromApi,
} from '@/features/playlist/playlistSlice';
import { AudioPlayerHost } from '@/features/audio/components/AudioPlayerHost';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { createSessionStart, joinSessionStart, setRole } from '@/features/session/sessionSlice';
import { PlaylistListener } from '@/features/playlist/components/PlaylistListener';
import { AudioPlayerListener } from '@/features/audio/components/AudioPlayerListener';
import { paths } from '@/routes/paths';
import PlaylistAdapter from '@/features/playlist/playlistAdapter';
import { setTrack, setAudioState } from '@/features/audio/audioSlice';
import { useAudio } from '@/shared/hooks/useAudio';
import { getAudioService } from '@services/audio/audioService';
import DeleteDialog from '@/shared/components/DeleteDialog/DeleteDialog';
import { GroupPageSkeleton } from './GroupPage/components/GroupPageSkeleton';
import { cn, orderBy } from '@/shared/utils';
import { AvatarPreview } from '@/shared/components/AvatarPreview/AvatarPreview';
import { withAuth } from '@/shared/hoc/withAuth';
import AlertDialog from '@/shared/components/AlertDialog/AlertDialog';

const GroupPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const [isDeleteMember, setIsDeleteMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const connectionUsers = useAppSelector((state) => state.session.connectionUsers);
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isLeaveGroupDialogOpen, setIsLeaveGroupDialogOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { createSession, joinSession, leaveSession } = useWebSocket();

  const isHostRef = useRef<boolean | null>(null);
  const isConnectingRef = useRef(false);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedGroupIdRef = useRef<string | null>(null);
  const createdByRef = useRef<string | null>(null);
  const listenerAudioInitializedRef = useRef<string | null>(null);
  const { play } = useAudio();
  const [dialogOpen, setDialogOpen] = useState<DialogType>(null);

  const isConnected = useAppSelector((state) => state.connection.isConnected);
  const audioState = useAppSelector((state) => state.audio);
  const tracks = useAppSelector(playListSelectors.tracks);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.getGroupById(groupId!),
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 5,
    retry: false,
  });

  const { data: groupPlaybackStateData } = useQuery({
    queryKey: ['group-playback-state', groupId],
    queryFn: () => groupsApi.getGroupPlaybackState(groupId!),
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 5,
    retry: false,
  });

  const group = data?.status && data?.group ? data.group : null;
  const members = group?.members || [];
  const isOwner = group?.created_by === user?.id;

  useEffect(() => {
    if (!groupPlaybackStateData?.playbackState || !groupId) return;
    // if (isOwner) return;

    const { playbackState: state } = groupPlaybackStateData;
    const currentRole = store.getState().session.role;

    const match =
      currentRole === 'dj' && state.trackUrl && listenerAudioInitializedRef.current !== groupId;

    if (match) {
      try {
        listenerAudioInitializedRef.current = groupId;

        // Generar un trackId si no está presente (usar URL como fallback)
        const trackId = state.trackId || state.trackUrl || '';

        dispatch(
          setTrack({
            trackId,
            trackUrl: state.trackUrl!,
            trackTitle: state.trackTitle || undefined,
            trackArtist: state.trackArtist || undefined,
          })
        );

        const audioService = getAudioService();

        // Convertir posición de milisegundos a segundos y validar
        let currentPosition = 0;
        if (state.position !== null && state.position !== undefined) {
          const positionInSeconds = state.position / 1000;
          // Validar que la posición esté en un rango razonable
          if (state.duration && state.duration > 0) {
            // Asegurar que la posición no exceda la duración
            currentPosition = Math.max(0, Math.min(positionInSeconds, state.duration));
          } else {
            currentPosition = Math.max(0, positionInSeconds);
          }
        }

        // Validar timestamp - si es muy grande o inválido, usar el actual
        let currentTimestamp = Date.now();
        if (state.lastEventTime && state.lastEventTime > 0) {
          // Verificar que el timestamp sea razonable (no más de 1 año en el futuro o pasado)
          const now = Date.now();
          const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
          const timestampDiff = Math.abs(state.lastEventTime - now);

          if (timestampDiff < oneYearInMs) {
            currentTimestamp = state.lastEventTime;
          } else {
            console.warn('Timestamp inválido detectado, usando timestamp actual:', {
              lastEventTime: state.lastEventTime,
              now,
              diff: timestampDiff,
            });
          }
        }

        audioService.init(state.trackUrl!, (audioState) => {
          dispatch(setAudioState(audioState));
        });

        setTimeout(() => {
          audioService.sync(currentPosition, currentTimestamp, state.isPlaying, state.trackUrl);
        }, 500);
      } catch (error) {
        console.error('Error al inicializar audio para listener:', error);
        listenerAudioInitializedRef.current = null;
      }
    }
  }, [groupPlaybackStateData, groupId, dispatch]);

  const handleLeaveGroup = () => {
    // dispatch(leaveSessionSlice());
    leaveSession();
  };

  const playlist = useMemo(() => {
    return data?.group
      ? (Array.isArray(data.group.current_track)
          ? data.group.current_track
          : [data.group.current_track]
        ).filter((track) => !!track)
      : null;
  }, [data]);

  const createdBy = useMemo(() => {
    if (!data?.group) return;
    if (createdByRef.current === data.group?.created_by) return data.group?.created_by;
    createdByRef.current = data?.group?.created_by || null;
    return data?.group?.created_by;
  }, [data]);

  useEffect(() => {
    if (playlist) {
      const tracks = orderBy(playlist.map(PlaylistAdapter.toCurrentTrack), 'addedAt', 'desc');
      dispatch(setPlaylistFromApi({ tracks }));
      const isHost = createdBy === user?.id;
      if (!isHost) return;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      timeoutId = setTimeout(() => {
        if (tracks.length > 0) {
          const index = 0;
          const track = tracks[index];
          if (!track) return;
          dispatch(setCurrentTrackIndex({ index }));
          dispatch(
            setTrack({
              trackId: track.id,
              trackUrl: track.url,
              trackTitle: track.title,
              trackArtist: track.artist,
            })
          );
          if (!createdByRef.current || !createdBy || createdByRef.current === createdBy) return;
          setTimeout(play, 1000);
        }
      }, 400);
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [dispatch, playlist, createdBy, user]);

  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      isConnectingRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!data || !user || isConnectingRef.current || !user) return;
    if (processedGroupIdRef.current === data.group.id) return;

    const connectToSession = () => {
      if (isConnectingRef.current) return;
      isConnectingRef.current = true;
      processedGroupIdRef.current = data.group.id;

      if (data.group.created_by !== user?.id) {
        if (data.group.members?.some((member) => member.user_id === user?.id)) {
          const sessionName = data.group.id;
          dispatch(setRole({ role: 'member' }));
          dispatch(joinSessionStart({ sessionId: sessionName }));
          joinSession(sessionName);
          isHostRef.current = false;
        }
        return;
      }
      const sessionName = data.group.id;
      dispatch(setRole({ role: 'dj' }));
      dispatch(createSessionStart({ name: sessionName }));
      createSession(sessionName, user);
      isHostRef.current = true;
    };

    if (isConnected) {
      connectionTimeoutRef.current = setTimeout(() => {
        connectToSession();
      }, 500);
    } else {
      let checkConnectionInterval: ReturnType<typeof setInterval> | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      checkConnectionInterval = setInterval(() => {
        if (isConnected && !isConnectingRef.current) {
          clearInterval(checkConnectionInterval!);
          if (timeoutId) clearTimeout(timeoutId);
          connectionTimeoutRef.current = setTimeout(() => {
            connectToSession();
          }, 800);
        }
      }, 100);

      timeoutId = setTimeout(() => {
        if (checkConnectionInterval) clearInterval(checkConnectionInterval);
        if (!isConnected) {
          console.warn('Timeout: Could not establish WebSocket connection');
          toast.error('Failed to connect to server. Please refresh the page.');
          isConnectingRef.current = false;
        }
      }, 10000);

      return () => {
        if (checkConnectionInterval) clearInterval(checkConnectionInterval);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
  }, [
    data?.group,
    data?.group.created_by,
    user,
    isConnected,
    dispatch,
    createSession,
    joinSession,
  ]);

  useEffect(() => {
    processedGroupIdRef.current = null;
    isConnectingRef.current = false;
    isHostRef.current = null;
    listenerAudioInitializedRef.current = null;
  }, [groupId]);

  const groupUsers = useMemo(() => {
    const data: IGroupUsers = {
      dj: null,
      members: [],
    };

    for (const member of members) {
      if (member.role === 'dj') {
        data.dj = member;
      } else if (member.role === 'member') {
        data.members.push(member);
      }
    }
    return data;
  }, [members]);

  const onlineMembers = groupUsers.members.filter((member) => connectionUsers[member.user_id]);
  const offlineMembers = groupUsers.members.filter((member) => !connectionUsers[member.user_id]);

  useEffect(() => {
    return () => {
      handleLeaveGroup();
    };
  }, [groupId]);

  const handleRemoveMember = (member: Member) => {
    setSelectedMember(member);
    setIsDeleteMember(true);
  };

  useEffect(() => {
    if (!data) return;
    const members = data.group?.members || ([] as Member[]);
    const exists = members.some((member) => member.user_id === user?.id);
    if (!exists) {
      navigate(paths.LISTENERS(null));
    }
  }, [data]);

  const disconnectSentRef = useRef(false);

  const sendDjDisconnect = async (useKeepalive = false) => {
    if (!groupId || !isOwner || disconnectSentRef.current) return;

    const currentAudioState = store.getState().audio;
    const hasTrack = !!currentAudioState.trackUrl;
    const isPlaying = currentAudioState.isPlaying || false;

    disconnectSentRef.current = true;

    try {
      if (useKeepalive) {
        const payload = {
          groupId,
          hasTrack,
          isPlaying,
        };
        groupsApi.djToggleConnect(payload, 'disconnect');
      } else {
        await groupsApi.djDisconnect({
          groupId,
          hasTrack,
          isPlaying,
        });
      }
    } catch (error) {
      console.error('Error al enviar desconexión del DJ:', error);
      disconnectSentRef.current = false;
    }
  };

  useEffect(() => {
    if (!isOwner || !groupId) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const currentAudioState = store.getState().audio;
      const isPlaying = currentAudioState.isPlaying || false;

      if (isPlaying) {
        sendDjDisconnect(true);

        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOwner, groupId, audioState.isPlaying]);

  useEffect(() => {
    disconnectSentRef.current = false;
  }, [groupId]);

  if (isLoading) {
    return <GroupPageSkeleton />;
  }

  if (error || !group) {
    return (
      <div className="w-full max-w-4xl mx-auto pb-24">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="text-6xl">😕</div>
            <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
              Group not found
            </h3>
            <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md">
              {error instanceof Error
                ? error.message
                : 'The group you are looking for does not exist or you do not have access to it.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => navigate(-1)} variant="primary">
                Back to Groups
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const USER_MEMBERS = [...members];

  const onConfirmLeaveGroup = async () => {
    setDialogOpen(null);
    await sendDjDisconnect(false);
    navigate(isOwner ? paths.GROUPS(null) : paths.LISTENERS(null));
  };

  const onRejectLeaveGroup = () => {
    setDialogOpen(null);
  };

  const onGoBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isOwner && groupId) {
      const isPlaying = audioState.isPlaying || false;
      if (isPlaying) {
        e.preventDefault();
        setDialogOpen('leave-group');
      }
    }
  };

  return (
    <>
      <AlertDialog
        onConfirmation={onConfirmLeaveGroup}
        open={dialogOpen === 'leave-group'}
        onRejection={onRejectLeaveGroup}
      />
      <div className="w-full max-w-4xl mx-auto pb-24">
        <div className="mb-4 mt-2">
          <Link
            to={isOwner ? paths.GROUPS(null) : paths.LISTENERS(null)}
            onClick={onGoBack}
            className="inline-flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </Link>
        </div>

        {playlist?.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-light-card dark:bg-dark-card rounded-xl border border-light-hover dark:border-dark-hover p-6 mb-4"
          >
            {playlist?.length !== 0 && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
                  <Music size={20} />
                  Tracks
                </h2>
              </div>
            )}
            {isHostRef.current && groupId && <PlaylistHost groupId={groupId} />}
            {!isHostRef.current && <PlaylistListener />}
          </motion.div>
        ) : (
          <>
            {isHostRef.current && <AudioPlayerHost />}
            {!isHostRef.current && (
              <AudioPlayerListener name={tracks?.[0]?.title} artist={tracks?.[0]?.artist} />
            )}
          </>
        )}

        {groupUsers.dj && (
          <div>
            <div className={cn('mb-2 sm:gap-2')}>
              <div className="flex flex-col gap-2 bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-hover dark:border-dark-hover overflow-y-auto [overscroll-behavior:contain]">
                <MemberCard
                  isConnected={!!connectionUsers[groupUsers.dj.user_id]}
                  onRemove={handleRemoveMember}
                  key={groupUsers.dj.id}
                  member={groupUsers.dj}
                  isOwner
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
            <Users size={20} />
            Members ({groupUsers.members.length})
          </h2>
          {isOwner && groupId && (
            <Button
              onClick={() => setIsAddMemberModalOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <UserPlus size={16} />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className=""
          >
            {USER_MEMBERS.length === 0 ? (
              <div className="text-center py-8">
                <Users
                  size={48}
                  className="mx-auto text-light-text-secondary dark:text-dark-text-secondary mb-2 opacity-50"
                />
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  No members yet
                </p>
              </div>
            ) : (
              <div>
                <div
                  className={cn(
                    'mb-2 ',
                    isOwner ? 'sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2' : ''
                  )}
                >
                  <div className="col-span-2 sticky top-0 z-10">
                    <h3 className="text-xs text-zinc-400 mb-1">{onlineMembers.length} Online</h3>
                  </div>
                  {onlineMembers.length > 0 && (
                    <div className="flex flex-col gap-2 bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-hover dark:border-dark-hover max-h-[420px] overflow-y-auto [overscroll-behavior:contain]">
                      {onlineMembers.map((member) => (
                        <MemberCard
                          key={member.id}
                          member={member}
                          isOwner={isOwner}
                          onRemove={handleRemoveMember}
                          isConnected={!!connectionUsers[member.user_id]}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    'mb-2',
                    isOwner ? 'sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2' : ''
                  )}
                >
                  <div className="col-span-2 sticky top-0 z-10">
                    <h3 className="text-xs text-zinc-400 mb-1">{offlineMembers.length} Offline</h3>
                    {offlineMembers.length !== 0 && (
                      <div className="flex flex-col gap-2 bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-hover dark:border-dark-hover  max-h-[420px] overflow-y-auto [overscroll-behavior:contain]">
                        {offlineMembers.map((member) => (
                          <MemberCard
                            key={member.id}
                            member={member}
                            isOwner={isOwner}
                            onRemove={handleRemoveMember}
                            isConnected={!!connectionUsers[member.user_id]}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        <h2 className="text-xs font-semibold text-zinc-400 flex items-center gap-2 mt-4">
          Group Information
        </h2>
        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-light-card dark:bg-dark-card rounded-xl border border-light-hover dark:border-dark-hover p-4"
        >
          <div className="flex items-center gap-2 justify-between">
            <p className="text-sm text-zinc-400 mb-1">Name</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm text-zinc-400 font-semibold">{group.name}</code>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-between">
            <p className="text-sm text-zinc-400 mb-1">Code</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm text-zinc-400">{group.code}</code>
            </div>
          </div>
        </motion.div>

        {/* Add Member Modal */}
      </div>
      {groupId && (
        <AddMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          groupId={groupId}
          onSuccess={() => {
            toast.success('Member added successfully');
          }}
        />
      )}
      <DeleteDialog
        modelNameValue={selectedMember?.name || 'Unknown'}
        mutationFn={groupsApi.removeMemberFromGroup}
        onClose={() => setIsDeleteMember(false)}
        queryKeys={[['group', groupId!]]}
        isOpen={isDeleteMember}
        payload={{ id: selectedMember?.id ?? '' }}
        modelName="member"
        onSuccess={() => {
          toast.success('Member deleted successfully');
          refetch();
        }}
      />
      <DeleteDialog
        modelNameValue={group.name}
        mutationFn={groupsApi.leaveGroup}
        onClose={() => setIsLeaveGroupDialogOpen(false)}
        queryKeys={[['group', groupId!], ['groups'], ['others-groups']]}
        isOpen={isLeaveGroupDialogOpen}
        payload={{ groupId: groupId! }}
        modelName="group"
        onSuccess={() => {
          handleLeaveGroup();
          navigate(paths.LISTENERS(null));
        }}
      />
    </>
  );
};

interface MemberCardProps {
  member: Member;
  isOwner: boolean;
  onRemove: (member: Member) => void;
  isConnected: boolean;
}

const MemberCard = ({ member, isOwner, onRemove, isConnected }: MemberCardProps) => {
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // const formatDate = (dateString: string) => {
  //   const date = new Date(dateString);
  //   const now = new Date();
  //   const diffInMs = now.getTime() - date.getTime();
  //   const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  //   if (diffInDays === 0) return 'Today';
  //   if (diffInDays === 1) return 'Yesterday';
  //   if (diffInDays < 7) return `${diffInDays} days ago`;
  //   return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  // };

  const handleAvatarClick = () => {
    if (member.avatar_url) {
      setIsAvatarPreviewOpen(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center last:mb-0 gap-3 hover:border-primary-600/30 transition-colors',
          !isConnected ? 'opacity-50' : ''
        )}
      >
        <div
          className={cn(
            'relative flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center text-white text-sm font-bold',
            member.avatar_url &&
              'cursor-pointer hover:ring-2 hover:ring-primary-500/50 transition-all'
          )}
          onClick={handleAvatarClick}
        >
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getInitials(member.name || member.guest_name)
          )}
          {isConnected && (
            <div className="w-3.5 h-3.5 rounded-full bg-green-500 absolute -bottom-0.5 -right-0.5 border-2 border-white dark:border-dark-hover"></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-light-text dark:text-dark-text truncate">
              {member.display_name || member.name || member.guest_name || 'Guest'}
            </p>
            {member.role === 'owner' && (
              <Crown size={14} className="text-primary-600 flex-shrink-0" fill="currentColor" />
            )}
          </div>
          {/* <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-zinc-400 capitalize">{member.role}</span>
            <span className="text-xs text-zinc-400">•</span>
            <span className="text-xs text-zinc-400">Joined {formatDate(member.joined_at)}</span>
          </div> */}
        </div>
        {isOwner && member.role !== 'dj' && (
          <Button
            onClick={() => onRemove(member)}
            variant="ghost-danger"
            size="sm"
            className="flex items-center gap-2"
          >
            <UserMinus size={16} />
          </Button>
        )}
        {isOwner && (
          <div className="bg-primary-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
            DJ
          </div>
        )}
      </div>

      {member.avatar_url && (
        <AvatarPreview
          isOpen={isAvatarPreviewOpen}
          onClose={() => setIsAvatarPreviewOpen(false)}
          imageUrl={member.avatar_url}
          name={member.name || member.guest_name}
        />
      )}
    </>
  );
};

export default withAuth(GroupPage);
