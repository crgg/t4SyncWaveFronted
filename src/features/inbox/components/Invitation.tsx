import { Check, CircleCheckBig, ClockAlert, UserPlus, X } from 'lucide-react';

import * as Types from '../inbox.types';

import { btnColors } from '@shared/components/Button/Button';
import { cn, extractWords } from '@shared/utils';

interface InvitationProps {
  invitation: Types.Invitation;
  acceptInvitationHandleClick: (invitation: Types.Invitation) => void;
  declineInvitationHandleClick: (invitation: Types.Invitation) => void;
}

const Invitation = ({
  invitation,
  acceptInvitationHandleClick,
  declineInvitationHandleClick,
}: InvitationProps) => {
  const isExpired = new Date(invitation.expires_at) < new Date();
  const showControls = invitation.status === 'pending';

  const colors = {
    [Types.EInvitationStatus.PENDING]: {
      bg: 'bg-primary-500/10 dark:bg-primary-light/10',
      text: 'text-primary-500 dark:text-primary-light',
    },
    [Types.EInvitationStatus.ACCEPTED]: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-green-500 dark:text-emerald-500',
    },
    [Types.EInvitationStatus.EXPIRED]: {
      bg: 'bg-red-500/10 dark:bg-red-light/10',
      text: 'text-red-500 dark:text-red-light',
    },
    [Types.EInvitationStatus.REVOKED]: {
      bg: 'bg-gray-500/10 dark:bg-gray-light/10',
      text: 'text-gray-500 dark:text-gray-light',
    },
  };

  return (
    <div
      key={invitation.id}
      className={cn(
        'border rounded-lg bg-light-card dark:bg-dark-card dark:border-dark-hover relative p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3',
        isExpired ? 'cursor-not-allowed' : ''
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            colors[invitation.status as keyof typeof colors].bg
          )}
        >
          <span
            className={cn(
              'font-semibold text-base',
              colors[invitation.status as keyof typeof colors].text
            )}
          >
            {isExpired && <ClockAlert size={16} />}
            {invitation.status === 'pending' && <UserPlus size={18} strokeWidth={2} />}
            {invitation.status === 'accepted' && <CircleCheckBig size={18} strokeWidth={2} />}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-700 dark:text-zinc-300">
            You've been invited to <strong>"{invitation.group_name}"</strong>
          </p>
          <div className="text-zinc-400 dark:text-zinc-400 text-[11px]">
            By {extractWords(invitation.invited_by_name, 4)}
            {/* <span className="ms-1">
              ({invitation.invited_by_email || invitation.invitee_phone})
            </span> */}
          </div>
        </div>
      </div>
      {showControls && (
        <div className="flex gap-1 self-end sm:self-center">
          <button
            className={cn(
              btnColors.emerald,
              'py-1 sm:py-0.5 rounded-full font-semibold text-[10px] w-20 flex items-center justify-center gap-1'
            )}
            onClick={() => acceptInvitationHandleClick(invitation)}
          >
            <Check size={14} strokeWidth={3} />
            Accept
          </button>
          <button
            className={cn(
              btnColors.outlineRed,
              'py-1 sm:py-0.5 rounded-full font-semibold text-[10px] w-20 flex items-center justify-center gap-1'
            )}
            onClick={() => declineInvitationHandleClick(invitation)}
          >
            <X size={14} strokeWidth={3} />
            Decline
          </button>
        </div>
      )}
      {/* {invitation.status === 'accepted' && (
			<div className="flex gap-1">
				<p className="py-2 rounded-full font-semibold text-xs w-16 block text-emerald-500 dark:text-emerald-400">
					Accepted
				</p>
			</div>
		)} */}
    </div>
  );
};

export default Invitation;
