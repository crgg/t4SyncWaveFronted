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
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const identityToName = React.useMemo(
    () => buildIdentityToNameMap(members, currentUserName, currentUserId),
    [members, currentUserName, currentUserId]
  );
  const canPublish = sessionType === 'video' || sessionType === 'audio';

  const handleDisconnected = () => {
    onLeave?.();
    onDisconnected?.();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (isFullscreen) {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    } else {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    }
  };

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'media-session-room',
        'w-full min-w-0 rounded-xl overflow-hidden border border-light-hover dark:border-dark-hover',
        'bg-light-card dark:bg-dark-card',
        'relative',
        /* Video: 16:9 aspect ratio, min 200px; Audio: min 200px */
        sessionType === 'video'
          ? 'aspect-video min-h-[200px] sm:min-h-[240px]'
          : 'min-h-[200px] sm:min-h-[240px]',
        isFullscreen && 'media-session-room--fullscreen aspect-auto min-h-0 rounded-none border-0',
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
        className="media-session-room__livekit w-full h-full min-h-0"
      >
        {sessionType === 'video' ? (
          <VideoConferenceNoChat
            identityToName={identityToName}
            onFullscreenToggle={toggleFullscreen}
            isFullscreen={isFullscreen}
            className="[&_.lk-grid-layout-wrapper]:bg-transparent [&_.lk-focus-layout-wrapper]:bg-transparent"
            style={{ '--lk-bg': 'transparent' } as React.CSSProperties}
          />
        ) : (
          <AudioConferenceNoChat
            identityToName={identityToName}
            onFullscreenToggle={toggleFullscreen}
            isFullscreen={isFullscreen}
            className="[&_.lk-audio-conference-stage]:p-4"
          />
        )}
      </LiveKitRoom>
    </div>
  );
};
