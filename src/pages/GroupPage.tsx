import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Music,
  Copy,
  Clock,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Radio,
  Crown,
  UserPlus,
  UserMinus,
  LogOut,
  Headphones,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { groupsApi } from '@/features/groups/groupsApi';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@shared/components/Button/Button';
import { AddMemberModal } from '@/features/groups/components/AddMemberModal';
import type { Member } from '@/features/groups/groups.types';
import { PlaylistHost } from '@/features/playlist/components/PlaylistHost';
import { setCurrentTrackIndex, setPlaylistFromApi } from '@/features/playlist/playlistSlice';
import { AudioPlayerHost } from '@/features/audio/components/AudioPlayerHost';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import {
  createSessionStart,
  joinSessionStart,
  // leaveSession,
  setRole,
} from '@/features/session/sessionSlice';
import { PlaylistListener } from '@/features/playlist/components/PlaylistListener';
import { AudioPlayerListener } from '@/features/audio/components/AudioPlayerListener';
import { ConnectionStatus } from '@/shared/components/ConnectionStatus/ConnectionStatus';
import { paths } from '@/routes/paths';
import PlaylistAdapter from '@/features/playlist/playlistAdapter';
import { setTrack } from '@/features/audio/audioSlice';
import { useAudio } from '@/shared/hooks/useAudio';
import DeleteDialog from '@/shared/components/DeleteDialog/DeleteDialog';
import { GroupPageSkeleton } from './GroupPage/components/GroupPageSkeleton';
import { cn } from '@/shared/utils';
import { AvatarPreview } from '@/shared/components/AvatarPreview/AvatarPreview';

const GroupPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const [isDeleteMember, setIsDeleteMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const connectionUsers = useAppSelector((state) => state.session.connectionUsers);
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isLeaveGroupDialogOpen, setIsLeaveGroupDialogOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { createSession, joinSession, leaveSession } = useWebSocket();
  const isHostRef = useRef<boolean | null>(null);
  const isConnectingRef = useRef(false);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedGroupIdRef = useRef<string | null>(null);
  const createdByRef = useRef<string | null>(null);
  const { play } = useAudio();

  const isConnected = useAppSelector((state) => state.connection.isConnected);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.getGroupById(groupId!),
    enabled: !!groupId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    throwOnError: () => {
      navigate(paths.LISTENERS(null));
      return false;
    },
    retry: false,
  });

  const handleLeaveGroup = () => {
    leaveSession();
  };

  const handleLeaveGroupClick = () => {
    setIsLeaveGroupDialogOpen(true);
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
      const tracks = playlist.map(PlaylistAdapter.toCurrentTrack);
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
  }, [groupId]);

  const group = data?.status && data?.group ? data.group : null;
  const members = group?.members || [];
  const isOwner = group?.created_by === user?.id;

  const onlineMembers = members.filter((member) => connectionUsers[member.user_id]);
  const offlineMembers = members.filter((member) => !connectionUsers[member.user_id]);

  useEffect(() => {
    return () => {
      handleLeaveGroup();
    };
  }, [groupId]);

  const handleCopyCode = () => {
    if (group?.code) {
      navigator.clipboard.writeText(group.code);
      setCopiedCode(true);
      toast.success('Group code copied to clipboard');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

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

  const USER_DJ = members.find((member) => member.role === 'dj');
  const USER_MEMBERS = [...members];

  // Determinar si el DJ está activo y conectado
  const isDJActive = USER_DJ && connectionUsers[USER_DJ.user_id];
  const isDJPlaying = isDJActive && group.is_playing;

  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      <div className="mb-4 mt-2">
        <Link
          to={isOwner ? paths.GROUPS(null) : paths.LISTENERS(null)}
          className="inline-flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back to Groups</span>
        </Link>
      </div>

      {/* DJ Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'mb-6 rounded-xl shadow-xl border-2 p-5 relative overflow-hidden',
          isDJActive
            ? isDJPlaying
              ? 'bg-gradient-to-r from-green-500/30 via-emerald-500/30 to-green-500/30 dark:from-green-600/40 dark:via-emerald-600/40 dark:to-green-600/40 border-green-500 dark:border-green-400'
              : 'bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 dark:from-green-600/30 dark:via-emerald-600/30 dark:to-green-600/30 border-green-500/50 dark:border-green-400/50'
            : 'bg-gradient-to-r from-gray-500/20 via-slate-500/20 to-gray-500/20 dark:from-gray-600/30 dark:via-slate-600/30 dark:to-gray-600/30 border-gray-500/50 dark:border-gray-400/50'
        )}
      >
        {/* Animated background effect when DJ is playing */}
        {isDJPlaying && (
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{
              background: [
                'radial-gradient(circle at 20% 50%, rgba(34, 197, 94, 0.3) 0%, transparent 50%)',
                'radial-gradient(circle at 80% 50%, rgba(16, 185, 129, 0.3) 0%, transparent 50%)',
                'radial-gradient(circle at 20% 50%, rgba(34, 197, 94, 0.3) 0%, transparent 50%)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        )}

        <div className="flex items-center gap-4 relative z-10">
          <motion.div
            animate={
              isDJActive
                ? {
                    scale: [1, 1.15, 1],
                    rotate: [0, 5, -5, 0],
                  }
                : {}
            }
            transition={{
              duration: 2,
              repeat: isDJActive ? Infinity : 0,
              ease: 'easeInOut',
            }}
            className={cn(
              'flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center relative',
              isDJActive
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 shadow-lg shadow-green-500/50'
                : 'bg-gradient-to-br from-gray-500 to-slate-600 dark:from-gray-600 dark:to-slate-700 shadow-lg shadow-gray-500/50'
            )}
          >
            {isDJActive ? (
              <Headphones className="text-white" size={32} />
            ) : (
              <VolumeX className="text-white" size={32} />
            )}
            {isDJActive && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-green-400 dark:border-green-300"
                animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3
                className={cn(
                  'text-2xl font-bold',
                  isDJActive
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-700 dark:text-gray-300'
                )}
              >
                {isDJActive ? '🎵 Active DJ' : '🔇 DJ Not Available'}
              </h3>
              {isDJActive && (
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex gap-1"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </motion.div>
              )}
            </div>
            <p
              className={cn(
                'text-base font-semibold',
                isDJActive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              {isDJActive ? (
                <span className="flex items-center gap-2">
                  {isDJPlaying ? (
                    <>
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Waves className="text-green-600 dark:text-green-400" size={20} />
                      </motion.div>
                      <span>¡Music is live! Listen now 🎧</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="text-green-600 dark:text-green-400" size={20} />
                      <span>DJ connected and ready to play music</span>
                    </>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <VolumeX size={20} />
                  <span>
                    {USER_DJ
                      ? `${USER_DJ.name || 'DJ'} is not connected in this moment`
                      : 'No DJ assigned in this group'}
                  </span>
                </span>
              )}
            </p>
            {isDJActive && USER_DJ && (
              <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">
                DJ: {USER_DJ.name || 'Anonymous'}
              </p>
            )}
          </div>

          {isDJActive && (
            <motion.div
              animate={
                isDJPlaying
                  ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
                  : { scale: [1, 1.05, 1] }
              }
              transition={{ duration: 2, repeat: Infinity }}
              className="hidden sm:flex items-center gap-2 px-5 py-3 rounded-xl bg-green-500/30 dark:bg-green-600/40 border-2 border-green-500/50 dark:border-green-400/50 shadow-lg"
            >
              <Radio className="text-green-700 dark:text-green-300" size={24} />
              <span className="text-base font-bold text-green-700 dark:text-green-300">
                {isDJPlaying ? 'LIVE' : 'READY'}
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="mb-6">
        <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-xl border border-light-hover dark:border-dark-hover p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {group.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-light-text dark:text-dark-text truncate">
                    {group.name}
                  </h1>

                  {isOwner && (
                    <Crown
                      size={20}
                      className="text-primary-600 flex-shrink-0"
                      fill="currentColor"
                    />
                  )}
                </div>
                <small className="text-sm text-light-text-secondary dark:text-dark-text-secondary block mb-2">
                  {group.code}
                </small>
                <div className="flex items-center gap-4 flex-wrap">
                  <ConnectionStatus />
                  {group.is_playing && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-primary-600/20 text-primary-600 dark:text-primary-400 border border-primary-600/30">
                      <Radio size={12} />
                      Now Playing
                    </span>
                  )}
                </div>
              </div>
            </div>
            {!isOwner && (
              <Button
                onClick={handleLeaveGroupClick}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 border-red-600/30 dark:border-red-400/30"
              >
                <LogOut size={16} />
              </Button>
            )}
          </div>

          {group.code && (
            <div className="mt-4 pt-4 border-t border-light-hover dark:border-dark-hover hidden">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Copy
                    size={16}
                    className="text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0"
                  />
                  <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Group Code:
                  </span>
                  <code className="font-mono font-semibold text-base text-light-text dark:text-dark-text truncate">
                    {group.code}
                  </code>
                </div>
                <Button
                  onClick={handleCopyCode}
                  variant={copiedCode ? 'primary' : 'outline'}
                  size="sm"
                  className="flex-shrink-0"
                >
                  {copiedCode ? (
                    <>
                      <CheckCircle2 size={16} className="mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} className="mr-1" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
      >
        <div className="bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-hover dark:border-dark-hover">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-600/10">
              <Users size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Members
              </p>
              <div className="text-xl font-bold text-light-text dark:text-dark-text inline-flex items-center gap-2">
                <div className="flex justify-center items-center gap-2">
                  <div className="flex justify-center items-center gap-2">
                    {onlineMembers.length}
                  </div>
                  <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Online
                  </div>
                </div>
                <div className="flex justify-center items-center gap-2">
                  <div className="flex justify-center items-center gap-2">
                    {offlineMembers.length}
                  </div>
                  <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Offline
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-hover dark:border-dark-hover">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-600/10">
              <Music size={20} className="text-primary-600" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">DJ</p>
              <p className="text-xl font-bold text-light-text dark:text-dark-text text-nowrap truncate">
                {USER_DJ?.name || 'Anonymous'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-hover dark:border-dark-hover">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-600/10">
              <Calendar size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Created
              </p>
              <p className="text-sm font-semibold text-light-text dark:text-dark-text">
                {new Date(group.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-light-card dark:bg-dark-card rounded-xl shadow-xl border border-light-hover dark:border-dark-hover p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
              <Users size={20} />
              Members ({USER_MEMBERS.length})
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
                  'mb-2 max-h-[250px] overflow-y-auto [overscroll-behavior:contain]',
                  isOwner ? 'sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2' : ''
                )}
              >
                <div className="col-span-2 sticky top-0 bg-light-card dark:bg-dark-card z-10">
                  <h3 className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                    Members Online
                  </h3>
                </div>
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
              <div
                className={cn(
                  'mb-2 max-h-[250px] overflow-y-auto [overscroll-behavior:contain]',
                  isOwner ? 'sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2' : ''
                )}
              >
                <div className="col-span-2 sticky top-0 bg-light-card dark:bg-dark-card z-10">
                  <h3 className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                    Members Offline
                  </h3>
                </div>
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
            </div>
          )}
        </motion.div>

        {/* Tracks Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-light-card dark:bg-dark-card rounded-xl shadow-xl border border-light-hover dark:border-dark-hover p-6"
        >
          {playlist?.length !== 0 && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
                <Music size={20} />
                Current Tracks
              </h2>
            </div>
          )}

          {isHostRef.current === true && groupId && <PlaylistHost groupId={groupId} />}
          {isHostRef.current === false && <PlaylistListener />}
        </motion.div>
      </div>

      {isHostRef.current === true && <AudioPlayerHost />}
      {isHostRef.current === false && (
        <AudioPlayerListener name={playlist?.[0]?.title} artist={playlist?.[0]?.artist} />
      )}

      {/* Additional Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 bg-light-card dark:bg-dark-card rounded-xl shadow-xl border border-light-hover dark:border-dark-hover p-6"
      >
        <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4 flex items-center gap-2">
          <Clock size={20} />
          Group Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Created by
            </p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center text-white text-xs font-bold">
                {getInitials(group.created_by_name)}
              </div>
              <p className="font-medium text-light-text dark:text-dark-text">
                {group.created_by_name || 'Unknown'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Created at
            </p>
            <p className="font-medium text-light-text dark:text-dark-text">
              {formatDate(group.created_at)}
            </p>
          </div>
          <div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Last updated
            </p>
            <p className="font-medium text-light-text dark:text-dark-text">
              {formatDate(group.updated_at)}
            </p>
          </div>
          {group.is_playing && group.current_time_ms > 0 && (
            <div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                Current time
              </p>
              <p className="font-medium text-light-text dark:text-dark-text">
                {formatTime(group.current_time_ms)}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Add Member Modal */}
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
        payload={{
          // groupId: groupId!,
          id: selectedMember?.id || '',
        }}
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
    </div>
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

  const handleAvatarClick = () => {
    if (member.avatar_url) {
      setIsAvatarPreviewOpen(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-hover dark:border-dark-hover hover:border-primary-600/30 transition-colors',
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
              {member.name || member.guest_name || 'Guest'}
            </p>
            {member.role === 'owner' && (
              <Crown size={14} className="text-primary-600 flex-shrink-0" fill="currentColor" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary capitalize">
              {member.role}
            </span>
            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              •
            </span>
            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              Joined {formatDate(member.joined_at)}
            </span>
          </div>
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

export default GroupPage;
