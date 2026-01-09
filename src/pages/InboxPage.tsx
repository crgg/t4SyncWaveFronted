import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

import * as Page from '@/shared/components/Page/Page';

import { inboxApi } from '@features/inbox/inboxApi';
import { withAuth } from '@shared/hoc/withAuth';
import {
  Check,
  CircleCheck,
  CircleX,
  ClockAlert,
  UserPlus,
  X,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { cn, extractWords } from '@/shared/utils';
import { btnColors } from '@/shared/components/Button/Button';
import { Button } from '@/shared/components/Button/Button';
import { Skeleton } from '@/shared/components/Skeleton/Skeleton';

const InboxPage = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inbox'],
    queryFn: inboxApi.getInvitations,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 2,
  });

  const invitations = data?.invitations || [];

  // Loading State
  if (isLoading) {
    return (
      <Page.Wrapper>
        <Page.Title title="Inbox" description="Manage your invitations to groups" />
        <Page.Content>
          <h3 className="font-semibold text-light-text dark:text-zinc-300 truncate text-sm sm:text-base mb-2">
            Group Invitation
          </h3>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border rounded-lg bg-light-card dark:bg-dark-card dark:border-dark-hover p-2 sm:p-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 flex-1">
                <Skeleton
                  variant="rectangular"
                  width={40}
                  height={40}
                  className="rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton variant="text" width="70%" height={16} />
                  <Skeleton variant="text" width="50%" height={12} />
                </div>
              </div>
              <div className="flex gap-1">
                <Skeleton
                  variant="rectangular"
                  width={80}
                  height={32}
                  className="rounded-full hidden sm:block"
                />
                <Skeleton
                  variant="rectangular"
                  width={32}
                  height={32}
                  className="rounded-full block sm:hidden"
                />
              </div>
            </div>
          ))}
        </Page.Content>
      </Page.Wrapper>
    );
  }

  // Error State
  if (error) {
    return (
      <Page.Wrapper>
        <Page.Title title="Inbox" description="Manage your invitations to groups" />
        <div className="flex items-center justify-center min-h-[50vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="text-6xl">😕</div>
            <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
              Failed to load invitations
            </h3>
            <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md">
              {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
            </p>
            <Button
              onClick={() => refetch()}
              variant="primary"
              className="mt-4 flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={18} />
              Try Again
            </Button>
          </motion.div>
        </div>
      </Page.Wrapper>
    );
  }

  // Empty State
  if (invitations.length === 0) {
    return (
      <Page.Wrapper>
        <Page.Title title="Inbox" description="Manage your invitations to groups" />
        <div className="flex items-center justify-center min-h-[50vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 dark:bg-primary-light/10 rounded-full">
                <Inbox className="text-primary dark:text-primary-light" size={48} />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
              No invitations yet
            </h3>
            <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md">
              You don't have any pending invitations. When someone invites you to a group, it will
              appear here.
            </p>
          </motion.div>
        </div>
      </Page.Wrapper>
    );
  }

  return (
    <Page.Wrapper>
      <Page.Title title="Inbox" description="Manage your invitations to groups" />
      <Page.Content>
        <h3 className="font-semibold text-light-text dark:text-zinc-300 truncate text-sm sm:text-base">
          Group Invitation
        </h3>
        {invitations.map((invitation) => {
          const isExpired = new Date(invitation.expires_at) < new Date();
          return (
            <div
              key={invitation.id}
              className={cn(
                'border rounded-lg bg-light-card dark:bg-dark-card dark:border-dark-hover relative p-2 sm:p-3 flex items-center justify-between gap-3',
                isExpired ? 'cursor-not-allowed' : ''
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary-light/10 flex items-center justify-center',
                    isExpired
                      ? 'bg-zinc-500/10 dark:bg-zinc-400/10'
                      : 'bg-primary/10 dark:bg-primary-light/10'
                  )}
                >
                  <span
                    className={cn(
                      ' font-semibold text-base',
                      isExpired
                        ? 'text-zinc-500 dark:text-zinc-400'
                        : 'text-primary dark:text-primary-light'
                    )}
                  >
                    {isExpired ? <ClockAlert size={16} /> : <UserPlus size={16} />}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">
                    You've been invited to <strong>"{invitation.group_name}"</strong>
                  </p>
                  <div className="text-zinc-400 dark:text-zinc-400 text-[11px]">
                    By {extractWords(invitation.invited_by_name)}
                    <span className="ms-1">
                      ({invitation.invited_by_email || invitation.invitee_phone})
                    </span>
                  </div>
                </div>
              </div>
              {!isExpired ? (
                <div className="flex gap-1">
                  <button
                    className={cn(
                      btnColors.emerald,
                      'py-1.5 rounded-full font-semibold text-[10px] w-20 hidden sm:flex items-center justify-center gap-1'
                    )}
                  >
                    <Check size={14} strokeWidth={3} />
                    Accept
                  </button>
                  <button
                    className={cn(
                      btnColors.outlineRed,
                      'py-1.5 rounded-full font-semibold text-[10px] w-20 hidden sm:flex items-center justify-center gap-1'
                    )}
                  >
                    <X size={14} strokeWidth={3} />
                    Reject
                  </button>
                  <button
                    className={cn(
                      btnColors.emerald,
                      'py-2 rounded-full font-semibold text-xs w-8 block sm:hidden'
                    )}
                  >
                    <CircleCheck size={16} strokeWidth={3} className="mx-auto" />
                  </button>
                  <button
                    className={cn(
                      btnColors.outlineRed,
                      'py-2 rounded-full font-semibold text-xs w-8 block sm:hidden'
                    )}
                  >
                    <CircleX size={16} strokeWidth={3} className="mx-auto" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <p className="py-2 rounded-full font-semibold text-xs w-16 hidden sm:block text-zinc-500 dark:text-zinc-400">
                    Expired
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </Page.Content>
    </Page.Wrapper>
  );
};

export default withAuth(InboxPage);
