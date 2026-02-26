import * as React from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import type { MediaSessionType } from '@/features/groups/groups.types';
import type { Member } from '@/features/groups/groups.types';
import { cn } from '@/shared/utils';

import { VideoConferenceNoChat, AudioConferenceNoChat } from './MediaConferenceNoChat';
import { buildIdentityToNameMap } from './MediaConferenceNoChat';

import '@livekit/components-styles';

interface MediaSessionRoomProps {
  serverUrl: string;
  token: string;
  sessionType: MediaSessionType;
  onDisconnected?: () => void;
  onLeave?: () => void | Promise<void>;
  members?: Member[];
  currentUserId?: string;
  currentUserName?: string;
  className?: string;
}

export const MediaSessionRoom = ({
  serverUrl,
  token,
  sessionType,
  onDisconnected,
  onLeave,
  members,
  currentUserId,
  currentUserName,
  className,
}: MediaSessionRoomProps) => {
  const identityToName = React.useMemo(
    () => buildIdentityToNameMap(members, currentUserName, currentUserId),
    [members, currentUserName, currentUserId]
  );
  const canPublish = sessionType === 'video' || sessionType === 'audio';

  const handleDisconnected = () => {
    onLeave?.();
    onDisconnected?.();
  };

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border border-light-hover dark:border-dark-hover',
        'bg-light-card dark:bg-dark-card',
        className
      )}
    >
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={canPublish}
        video={sessionType === 'video'}
        onDisconnected={handleDisconnected}
        className="min-h-[320px] w-full [&_.lk-room-container]:rounded-xl [&_.lk-video-conference]:rounded-xl [&_.lk-audio-conference]:rounded-xl"
      >
        {sessionType === 'video' ? (
          <VideoConferenceNoChat
            identityToName={identityToName}
            className="[&_.lk-grid-layout-wrapper]:bg-transparent [&_.lk-focus-layout-wrapper]:bg-transparent"
            style={{ '--lk-bg': 'transparent' } as React.CSSProperties}
          />
        ) : (
          <AudioConferenceNoChat
            identityToName={identityToName}
            className="[&_.lk-audio-conference-stage]:p-4"
          />
        )}
      </LiveKitRoom>
    </div>
  );
};
