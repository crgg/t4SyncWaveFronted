import type { MediaSessionType } from '@/features/groups/groups.types';
import type { Member } from '@/features/groups/groups.types';

export interface MediaSessionSectionProps {
  groupId: string;
  isOwner: boolean;
  userName?: string;
  currentUserId?: string;
  members?: Member[];
}

export interface InCallCredentials {
  livekitUrl: string;
  token: string;
  type: MediaSessionType;
}
