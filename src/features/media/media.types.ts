import type { MediaSessionType } from '@/features/groups/groups.types';

export interface MediaSessionSectionProps {
  groupId: string;
  isOwner: boolean;
  userName?: string;
}

export interface InCallCredentials {
  livekitUrl: string;
  token: string;
  type: MediaSessionType;
}
