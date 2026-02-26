import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import { isEqualTrackRef, isTrackReference, isWeb } from '@livekit/components-core';
import { RoomEvent, Track } from 'livekit-client';
import * as React from 'react';
import {
  CarouselLayout,
  ConnectionStateToast,
  ControlBar,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  ParticipantAudioTile,
  ParticipantTile,
  RoomAudioRenderer,
  TrackLoop,
  useCreateLayoutContext,
  usePinnedTracks,
  useTracks,
} from '@livekit/components-react';
import { Maximize2, Minimize2 } from 'lucide-react';

import { ParticipantNameMapProvider } from './ParticipantNameContext';
import {
  VideoParticipantTileContent,
  AudioParticipantTileContent,
} from './ParticipantTileWithCustomName';
import type { Member } from '@/features/groups/groups.types';

export function buildIdentityToNameMap(
  members: Member[] = [],
  currentUserName?: string,
  currentUserId?: string
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of members) {
    const name = m.display_name || m.name || m.guest_name;
    if (m.user_id && name) map[m.user_id] = String(name);
  }
  if (currentUserId && currentUserName) map[currentUserId] = currentUserName;
  return map;
}

interface VideoConferenceNoChatProps extends React.HTMLAttributes<HTMLDivElement> {
  identityToName?: Record<string, string>;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
}

function VideoConferenceNoChat({
  identityToName = {},
  onFullscreenToggle,
  isFullscreen = false,
  ...props
}: VideoConferenceNoChatProps) {
  const layoutContext = useCreateLayoutContext();
  const lastAutoFocusedScreenShareTrack = React.useRef<TrackReferenceOrPlaceholder | null>(null);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false }
  );

  const screenShareTracks = tracks
    .filter(isTrackReference)
    .filter((track) => track.publication.source === Track.Source.ScreenShare);

  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const carouselTracks = tracks.filter((track) => !isEqualTrackRef(track, focusTrack));

  React.useEffect(() => {
    if (
      screenShareTracks.some((track) => track.publication.isSubscribed) &&
      lastAutoFocusedScreenShareTrack.current === null
    ) {
      layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: screenShareTracks[0] });
      lastAutoFocusedScreenShareTrack.current = screenShareTracks[0];
    } else if (
      lastAutoFocusedScreenShareTrack.current &&
      !screenShareTracks.some(
        (track) =>
          track.publication.trackSid ===
          lastAutoFocusedScreenShareTrack.current?.publication?.trackSid
      )
    ) {
      layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
      lastAutoFocusedScreenShareTrack.current = null;
    }
    if (focusTrack && !isTrackReference(focusTrack)) {
      const updatedFocusTrack = tracks.find(
        (tr) =>
          tr.participant.identity === focusTrack.participant.identity &&
          tr.source === focusTrack.source
      );
      if (updatedFocusTrack !== focusTrack && isTrackReference(updatedFocusTrack)) {
        layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: updatedFocusTrack });
      }
    }
  }, [
    screenShareTracks
      .map((ref) => `${ref.publication.trackSid}_${ref.publication.isSubscribed}`)
      .join(),
    focusTrack?.publication?.trackSid,
    tracks,
  ]);

  return (
    <ParticipantNameMapProvider identityToName={identityToName}>
      <div className="lk-video-conference" {...props}>
        {isWeb() && (
          <LayoutContextProvider value={layoutContext}>
            <div className="lk-video-conference-inner">
              {!focusTrack ? (
                <div className="lk-grid-layout-wrapper">
                  <GridLayout tracks={tracks}>
                    <ParticipantTile>
                      <VideoParticipantTileContent />
                    </ParticipantTile>
                  </GridLayout>
                </div>
              ) : (
                <div className="lk-focus-layout-wrapper">
                  <FocusLayoutContainer>
                    <CarouselLayout tracks={carouselTracks}>
                      <ParticipantTile>
                        <VideoParticipantTileContent />
                      </ParticipantTile>
                    </CarouselLayout>
                    {focusTrack && (
                      <FocusLayout trackRef={focusTrack}>
                        <VideoParticipantTileContent />
                      </FocusLayout>
                    )}
                  </FocusLayoutContainer>
                </div>
              )}
              <div className="lk-video-conference-controls">
                <ControlBar controls={{ chat: false, settings: false }} />
                {onFullscreenToggle && (
                  <button
                    type="button"
                    onClick={onFullscreenToggle}
                    className="media-session-room__fullscreen-btn"
                    aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                )}
              </div>
            </div>
          </LayoutContextProvider>
        )}
        <RoomAudioRenderer />
        <ConnectionStateToast />
      </div>
    </ParticipantNameMapProvider>
  );
}

interface AudioConferenceNoChatProps extends React.HTMLAttributes<HTMLDivElement> {
  identityToName?: Record<string, string>;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
}

function AudioConferenceNoChat({
  identityToName = {},
  onFullscreenToggle,
  isFullscreen = false,
  ...props
}: AudioConferenceNoChatProps) {
  const audioTracks = useTracks([Track.Source.Microphone]);

  return (
    <ParticipantNameMapProvider identityToName={identityToName}>
      <LayoutContextProvider>
        <div className="lk-audio-conference" {...props}>
          <div className="lk-audio-conference-stage">
            <TrackLoop tracks={audioTracks}>
              <ParticipantAudioTile>
                <AudioParticipantTileContent />
              </ParticipantAudioTile>
            </TrackLoop>
          </div>
          <div className="lk-audio-conference-controls">
            <ControlBar
              controls={{ microphone: true, screenShare: false, camera: false, chat: false }}
            />
            {onFullscreenToggle && (
              <button
                type="button"
                onClick={onFullscreenToggle}
                className="media-session-room__fullscreen-btn"
                aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            )}
          </div>
        </div>
      </LayoutContextProvider>
    </ParticipantNameMapProvider>
  );
}

export { VideoConferenceNoChat, AudioConferenceNoChat };
