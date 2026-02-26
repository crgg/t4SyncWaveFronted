import * as React from 'react';
import { Track } from 'livekit-client';
import { isTrackReference, isTrackReferencePinned } from '@livekit/components-core';
import {
  ConnectionQualityIndicator,
  FocusToggle,
  ParticipantPlaceholder,
  TrackMutedIndicator,
  VideoTrack,
  AudioTrack,
  BarVisualizer,
  useEnsureTrackRef,
  useFeatureContext,
  useMaybeLayoutContext,
  useIsEncrypted,
} from '@livekit/components-react';
import { LockLockedIcon, ScreenShareIcon } from '@livekit/components-react';
import { CustomParticipantName } from './ParticipantNameContext';

function VideoParticipantTileContent() {
  const trackReference = useEnsureTrackRef();
  const layoutContext = useMaybeLayoutContext();
  const isEncrypted = useIsEncrypted(trackReference.participant);
  const autoManageSubscription = useFeatureContext()?.autoSubscription;

  const handleSubscribe = React.useCallback(
    (subscribed: boolean) => {
      if (
        trackReference.source &&
        !subscribed &&
        layoutContext?.pin.dispatch &&
        isTrackReferencePinned(trackReference, layoutContext.pin.state)
      ) {
        layoutContext.pin.dispatch({ msg: 'clear_pin' });
      }
    },
    [trackReference, layoutContext]
  );

  return (
    <>
      {isTrackReference(trackReference) &&
      (trackReference.publication?.kind === 'video' ||
        trackReference.source === Track.Source.Camera ||
        trackReference.source === Track.Source.ScreenShare) ? (
        <VideoTrack
          trackRef={trackReference}
          onSubscriptionStatusChanged={handleSubscribe}
          manageSubscription={autoManageSubscription}
        />
      ) : (
        isTrackReference(trackReference) && (
          <AudioTrack trackRef={trackReference} onSubscriptionStatusChanged={handleSubscribe} />
        )
      )}
      <div className="lk-participant-placeholder">
        <ParticipantPlaceholder />
      </div>
      <div className="lk-participant-metadata">
        <div className="lk-participant-metadata-item">
          {trackReference.source === Track.Source.Camera ? (
            <>
              {isEncrypted && <LockLockedIcon style={{ marginRight: '0.25rem' }} />}
              <TrackMutedIndicator
                trackRef={{
                  participant: trackReference.participant,
                  source: Track.Source.Microphone,
                }}
                show="muted"
              />
              <CustomParticipantName />
            </>
          ) : (
            <>
              <ScreenShareIcon style={{ marginRight: '0.25rem' }} />
              <CustomParticipantName suffix="'s screen" />
            </>
          )}
        </div>
        <ConnectionQualityIndicator className="lk-participant-metadata-item" />
      </div>
      <FocusToggle trackRef={trackReference} />
    </>
  );
}

function AudioParticipantTileContent() {
  const trackReference = useEnsureTrackRef();

  return (
    <>
      {isTrackReference(trackReference) && <AudioTrack trackRef={trackReference} />}
      <BarVisualizer barCount={7} options={{ minHeight: 8 }} />
      <div className="lk-participant-metadata">
        <div className="lk-participant-metadata-item">
          <TrackMutedIndicator trackRef={trackReference} />
          <CustomParticipantName />
        </div>
        <ConnectionQualityIndicator className="lk-participant-metadata-item" />
      </div>
    </>
  );
}

export { VideoParticipantTileContent, AudioParticipantTileContent };
