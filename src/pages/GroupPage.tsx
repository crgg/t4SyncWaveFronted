/**
 * Página de detalle de un grupo específico
 */

import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Music,
  Copy,
  Play,
  Clock,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Radio,
  Crown,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';

import { groupsApi } from '@/features/groups/groupsApi';
import { useAppSelector } from '@/app/hooks';
import { Button } from '@shared/components/Button/Button';
import { AddMemberModal } from '@/features/groups/components/AddMemberModal';
import { toast } from 'react-toastify';
import type { Member } from '@/features/groups/groups.types';

const GroupPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.getGroupById(groupId!),
    enabled: !!groupId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  const group = data?.status && data?.group ? data.group : null;
  const members = group?.members || [];
  const currentTracks = group?.current_tracks || [];

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

  // Loading State
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto pb-24">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Loading group...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
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
              <Button onClick={() => navigate('/groups')} variant="primary">
                Back to Groups
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = group.created_by === userId;

  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      {/* Back Button */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-4">
        <Link
          to="/groups"
          className="inline-flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back to Groups</span>
        </Link>
      </motion.div>

      {/* Header Section */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-xl border border-light-hover dark:border-dark-hover p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Avatar */}
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {group.name.charAt(0).toUpperCase()}
              </div>

              {/* Name and Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
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
                <div className="flex items-center gap-4 flex-wrap">
                  {group.is_active && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30">
                      <CheckCircle2 size={12} />
                      Active
                    </span>
                  )}
                  {group.is_playing && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-primary-600/20 text-primary-600 dark:text-primary-400 border border-primary-600/30">
                      <Radio size={12} />
                      Now Playing
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Code Section */}
          {group.code && (
            <div className="mt-4 pt-4 border-t border-light-hover dark:border-dark-hover">
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
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
      >
        {/* Members Count */}
        <div className="bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-hover dark:border-dark-hover">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-600/10">
              <Users size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Members
              </p>
              <p className="text-xl font-bold text-light-text dark:text-dark-text">
                {members.length}
              </p>
            </div>
          </div>
        </div>

        {/* Tracks Count */}
        <div className="bg-light-card dark:bg-dark-card rounded-lg p-4 border border-light-hover dark:border-dark-hover">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-600/10">
              <Music size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Tracks
              </p>
              <p className="text-xl font-bold text-light-text dark:text-dark-text">
                {currentTracks.length}
              </p>
            </div>
          </div>
        </div>

        {/* Created Date */}
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-light-card dark:bg-dark-card rounded-xl shadow-xl border border-light-hover dark:border-dark-hover p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
              <Users size={20} />
              Members ({members.length})
            </h2>
            {isOwner && groupId && (
              <Button
                onClick={() => setIsAddMemberModalOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <UserPlus size={16} />
                Add Member
              </Button>
            )}
          </div>

          {members.length === 0 ? (
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
            <div className="space-y-3">
              {members.map((member) => (
                <MemberCard key={member.id} member={member} isOwner={isOwner} />
              ))}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
              <Music size={20} />
              Current Tracks ({currentTracks.length})
            </h2>
          </div>

          {currentTracks.length === 0 ? (
            <div className="text-center py-8">
              <Music
                size={48}
                className="mx-auto text-light-text-secondary dark:text-dark-text-secondary mb-2 opacity-50"
              />
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                No tracks in queue
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentTracks.map((track: any, index: number) => (
                <div
                  key={track.id || index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-hover dark:border-dark-hover"
                >
                  <div className="flex-shrink-0 w-8 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-light-text dark:text-dark-text truncate">
                      {track.title || track.name || 'Unknown Track'}
                    </p>
                    {track.artist && (
                      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">
                        {track.artist}
                      </p>
                    )}
                  </div>
                  {group.is_playing && group.current_track_id === track.id && (
                    <Play
                      size={16}
                      className="text-primary-600 flex-shrink-0"
                      fill="currentColor"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

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
    </div>
  );
};

interface MemberCardProps {
  member: Member;
  isOwner: boolean;
}

const MemberCard = ({ member }: MemberCardProps) => {
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

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-hover dark:border-dark-hover hover:border-primary-600/30 transition-colors">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center text-white text-sm font-bold">
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={member.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          getInitials(member.name || member.guest_name)
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
          <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">•</span>
          <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
            Joined {formatDate(member.joined_at)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GroupPage;
