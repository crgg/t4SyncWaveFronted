import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Video, Phone, Loader2, Users, AudioLines } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

import type { MediaSessionSectionProps, InCallCredentials } from '../media.types';
import type { MediaSessionType } from '@/features/groups/groups.types';

import { groupsApi } from '@/features/groups/groupsApi';
import { MediaSessionRoom } from './MediaSessionRoom';
import { cn } from '@/shared/utils';

export const MediaSessionSection = ({
  groupId,
  isOwner,
  userName,
  currentUserId,
  members,
}: MediaSessionSectionProps) => {
  const queryClient = useQueryClient();
  const [inCallCredentials, setInCallCredentials] = useState<InCallCredentials | null>(null);

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['media-session-status', groupId],
    queryFn: () => groupsApi.getMediaSessionStatus(groupId),
    enabled: !!groupId && !inCallCredentials,
    refetchInterval: inCallCredentials ? false : 5000,
  });

  const startMutation = useMutation({
    mutationFn: (type: MediaSessionType) => groupsApi.startMediaSession(groupId, type),
    onSuccess: async (_, type) => {
      queryClient.invalidateQueries({ queryKey: ['media-session-status', groupId] });
      await joinCall(type);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to start media session');
    },
  });

  const joinMutation = useMutation({
    mutationFn: () => groupsApi.joinMediaSession(groupId, { displayName: userName }),
    onSuccess: (data) => {
      if (data.status && data.livekitUrl && data.token) {
        setInCallCredentials({
          livekitUrl: data.livekitUrl,
          token: data.token,
          type: (data.type as MediaSessionType) || 'video',
        });
      } else {
        toast.error(data.msg || 'Failed to join');
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to join media session');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => groupsApi.leaveMediaSession(groupId),
    onSettled: () => {
      setInCallCredentials(null);
      queryClient.invalidateQueries({ queryKey: ['media-session-status', groupId] });
    },
  });

  const endMutation = useMutation({
    mutationFn: () => groupsApi.endMediaSession(groupId),
    onSettled: () => {
      setInCallCredentials(null);
      queryClient.invalidateQueries({ queryKey: ['media-session-status', groupId] });
    },
  });

  const joinCall = async (type?: MediaSessionType) => {
    const res = await groupsApi.joinMediaSession(groupId, { displayName: userName });
    if (res.status && res.livekitUrl && res.token) {
      setInCallCredentials({
        livekitUrl: res.livekitUrl,
        token: res.token,
        type: ((type || res.type) as MediaSessionType) || 'video',
      });
    } else {
      toast.error(res.msg || 'Failed to join');
    }
  };

  const handleLeave = async () => {
    if (isOwner) {
      await endMutation.mutateAsync();
      toast.success('Media session ended');
    } else {
      await leaveMutation.mutateAsync();
      toast.success('Left media session');
    }
  };

  const isActive = statusData?.active ?? false;
  const sessionType = statusData?.session?.type as MediaSessionType;

  if (statusLoading && !inCallCredentials) {
    return (
      <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-hover dark:border-dark-hover p-6">
        <div className="flex items-center justify-center gap-2 text-light-text-secondary dark:text-dark-text-secondary">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading media session...</span>
        </div>
      </div>
    );
  }

  if (inCallCredentials) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
            <Video size={18} />
            {/* Media Session */}
            <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-medium">
              {inCallCredentials.type === 'video' ? 'Video' : 'Audio'}
            </span>
          </h2>
        </div>
        <MediaSessionRoom
          serverUrl={inCallCredentials.livekitUrl}
          token={inCallCredentials.token}
          sessionType={inCallCredentials.type}
          onLeave={handleLeave}
          members={members}
          currentUserId={currentUserId}
          currentUserName={userName}
        />
      </motion.div>
    );
  }

  const startingWord = isActive ? 'Join' : isOwner ? 'Start' : 'Join';
  const disabledBtnVideo =
    (isActive && sessionType !== 'video') || (!(sessionType === 'video') && !isOwner);
  const disabledBtnAudio =
    (isActive && sessionType !== 'audio') || (!(sessionType === 'audio') && !isOwner);

  return (
    <>
      <div className="hidden md:flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
          <AudioLines size={18} />
          {/* Media Session (LiveKit) */}
          Channels
          {statusData?.participantCount !== undefined && statusData.participantCount > 0 && (
            <span className="ms-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-light-hover/50 dark:bg-dark-hover/50 text-light-text-secondary dark:text-dark-text-secondary text-xs">
              <Users size={14} />
              {statusData.participantCount} in call
            </span>
          )}
        </h2>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="hidden md:block bg-light-card dark:bg-dark-card rounded-xl border border-light-hover dark:border-dark-hover"
      >
        <div className="text-sm text-primary flex flex-col">
          <button
            className="p-3.5 enabled:hover:bg-primary-50 dark:enabled:hover:bg-dark-hover rounded-xl rounded-b-none flex items-center justify-between gap-2 disabled:cursor-not-allowed"
            onClick={() => (isActive ? joinMutation.mutate() : startMutation.mutate('video'))}
            disabled={disabledBtnVideo}
          >
            <div className={cn('space-x-2', disabledBtnVideo && 'text-zinc-400')}>
              {startMutation.isPending ? (
                <Loader2 size={17} strokeWidth={2} className="animate-spin inline-block" />
              ) : (
                <Video size={17} strokeWidth={2} className="inline-block" />
              )}{' '}
              <span>{!disabledBtnVideo ? startingWord : ''} Video Call</span>
            </div>
            {sessionType === 'video' && (
              <span className="text-emerald-500 font-semibold text-[10px] inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Enabled
              </span>
            )}
          </button>
          <button
            className="p-3.5 enabled:hover:bg-primary-50 dark:enabled:hover:bg-dark-hover rounded-xl rounded-t-none flex items-center justify-between gap-2 disabled:cursor-not-allowed"
            onClick={() => (isActive ? joinMutation.mutate() : startMutation.mutate('audio'))}
            disabled={disabledBtnAudio}
          >
            <div className={cn('space-x-2', disabledBtnAudio && 'text-zinc-400')}>
              {startMutation.isPending ? (
                <Loader2 size={17} strokeWidth={2} className="animate-spin inline-block" />
              ) : (
                <Phone size={17} strokeWidth={2} className="inline-block" />
              )}{' '}
              <span>{!disabledBtnAudio ? startingWord : ''} Audio Call</span>
            </div>
            {sessionType === 'audio' && (
              <span className="text-emerald-500 font-semibold text-[10px] inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Enabled
              </span>
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
};
