import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useEnsureParticipant } from '@livekit/components-react';

const ParticipantNameMapContext = createContext<Record<string, string>>({});

export function ParticipantNameMapProvider({
  identityToName,
  children,
}: {
  identityToName: Record<string, string>;
  children: ReactNode;
}) {
  const value = useMemo(() => identityToName, [identityToName]);
  return (
    <ParticipantNameMapContext.Provider value={value}>
      {children}
    </ParticipantNameMapContext.Provider>
  );
}

export function CustomParticipantName({ suffix = '' }: { suffix?: string }) {
  const participant = useEnsureParticipant();
  const identityToName = useContext(ParticipantNameMapContext);
  const displayName =
    identityToName[participant.identity] ?? (participant.name || participant.identity || 'Unknown');
  return (
    <span className="lk-participant-name">
      {displayName}
      {suffix}
    </span>
  );
}
