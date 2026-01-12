export interface InboxResponse extends ResponseBase {
  invitations: Invitation[];
  count: number;
}

export interface Invitation {
  id: string;
  group_id: string;
  invited_by: string;
  invitee_phone: string;
  invitee_user_id: any;
  status: string;
  created_at: string;
  expires_at: string;
  accepted_at: any;
  rejected_at: any;
  metadata: Record<string, any>;
  group_name: string;
  group_creator_id: string;
  invited_by_name: string;
  invited_by_email: string;
}

export interface IDialog {
  type: 'accept-invitation' | 'reject-invitation' | null;
  variant: TDialogVariant;
  open: boolean;
}

export interface IClassifiedInvitations {
  [EInvitationStatus.PENDING]: IClassifiedInvitation;
  [EInvitationStatus.ACCEPTED]: IClassifiedInvitation;
  [EInvitationStatus.EXPIRED]: IClassifiedInvitation;
  [EInvitationStatus.REVOKED]: IClassifiedInvitation;
}

export interface IClassifiedInvitation {
  label: string;
  items: Invitation[];
}

export enum EInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}
