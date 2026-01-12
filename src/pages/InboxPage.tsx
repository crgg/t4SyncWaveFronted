import { useMemo, useState } from 'react';

import { Inbox, RefreshCw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

import * as Page from '@/shared/components/Page/Page';
import * as Types from '@features/inbox/inbox.types';

import AlertDialog from '@shared/components/AlertDialog/AlertDialog';
import { Button } from '@shared/components/Button/Button';
import { Skeleton } from '@shared/components/Skeleton/Skeleton';
import Invitation from '@features/inbox/components/Invitation';

import { initialDialogState } from '@features/inbox/inbox.state';
import { inboxApi } from '@features/inbox/inboxApi';
import { getErrorMessage } from '@shared/utils';
import { withAuth } from '@shared/hoc/withAuth';
import { useAppSelector } from '@/app/hooks';

const InboxPage = () => {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [dialog, setDialog] = useState<Types.IDialog>(initialDialogState);
  const [selectedInvitation, setSelectedInvitation] = useState<Types.Invitation | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inbox'],
    queryFn: inboxApi.getInvitations,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 2,
  });

  const { mutate: acceptInvitation } = useMutation({
    mutationFn: inboxApi.acceptInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['others-groups', { userId }] });
      onCloseInvitation();
      toast.success('Invitation accepted successfully');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const { mutate: rejectInvitation } = useMutation({
    mutationFn: inboxApi.rejectInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['others-groups', { userId }] });
      onCloseInvitation();
      toast.success('Invitation rejected successfully');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const invitations = data?.invitations ?? [];
  const invitationCount = invitations.reduce(
    (acc, invitation) => acc + (invitation.status === 'pending' ? 1 : 0),
    0
  );

  const acceptInvitationHandleClick = (selected: Types.Invitation) => {
    setSelectedInvitation(selected);
    setDialog({
      type: 'accept-invitation',
      variant: 'emerald',
      open: true,
    });
  };

  const declineInvitationHandleClick = (selected: Types.Invitation) => {
    setSelectedInvitation(selected);
    setDialog({
      type: 'reject-invitation',
      variant: 'red',
      open: true,
    });
  };

  const onCloseInvitation = () => {
    setDialog(initialDialogState);
  };

  const onAcceptInvitation = () => {
    if (!selectedInvitation) return;
    acceptInvitation(selectedInvitation.id);
  };

  const onDeclineInvitation = () => {
    if (!selectedInvitation) return;
    rejectInvitation(selectedInvitation.id);
  };

  const classifiedInvitations: Types.IClassifiedInvitations = useMemo(
    () =>
      invitations.reduce(
        (acc: Types.IClassifiedInvitations, invitation: Types.Invitation) => {
          if (invitation.status === 'pending') {
            acc.pending.items.push(invitation);
          } else if (invitation.status === 'accepted') {
            acc.accepted.items.push(invitation);
          } else if (invitation.status === 'expired') {
            acc.expired.items.push(invitation);
          } else if (invitation.status === 'revoked') {
            acc.revoked.items.push(invitation);
          }
          return acc;
        },
        {
          [Types.EInvitationStatus.PENDING]: {
            label: 'Pending Invitations',
            items: [],
          },
          [Types.EInvitationStatus.ACCEPTED]: {
            label: 'Accepted Invitations',
            items: [],
          },
          [Types.EInvitationStatus.EXPIRED]: {
            label: 'Expired Invitations',
            items: [],
          },
          [Types.EInvitationStatus.REVOKED]: {
            label: 'Revoked Invitations',
            items: [],
          },
        }
      ),
    [invitations]
  );

  if (isLoading) {
    return (
      <Page.Wrapper>
        <Page.Title
          description="Manage your invitations to groups"
          count={invitationCount}
          title="Inbox"
        />
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
    <>
      <Page.Wrapper>
        <Page.Title
          description="Manage your invitations to groups"
          count={invitationCount}
          title="Inbox"
        />
        <Page.Content>
          <div className="space-y-4">
            {Object.values(classifiedInvitations).map(
              (classifiedInvitation: Types.IClassifiedInvitation) => (
                <div key={classifiedInvitation.label}>
                  <h3 className="font-semibold text-light-text dark:text-zinc-300 truncate text-sm sm:text-base mb-1">
                    {classifiedInvitation.label}
                  </h3>
                  {classifiedInvitation.items.length !== 0 ? (
                    classifiedInvitation.items.map((invitation) => (
                      <Invitation
                        declineInvitationHandleClick={declineInvitationHandleClick}
                        acceptInvitationHandleClick={acceptInvitationHandleClick}
                        invitation={invitation}
                        key={invitation.id}
                      />
                    ))
                  ) : (
                    <div className="text-zinc-400 dark:text-zinc-400 text-xs py-3">
                      No <b>{classifiedInvitation.label}</b> found
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </Page.Content>
      </Page.Wrapper>
      {/* Accept Invitation */}
      <AlertDialog
        message={
          dialog.type === 'accept-invitation'
            ? 'Are you sure you want to accept this invitation?'
            : 'Are you sure you want to decline this invitation?'
        }
        onRejection={onCloseInvitation}
        hasAutoConfirmation={false}
        onConfirmation={
          dialog.type === 'accept-invitation' ? onAcceptInvitation : onDeclineInvitation
        }
        variant={dialog.variant}
        title="Are you sure?"
        open={dialog.open}
        confirmButtonText={dialog.type === 'accept-invitation' ? 'Accept' : 'Yes, Decline'}
      />
    </>
  );
};

export default withAuth(InboxPage);
