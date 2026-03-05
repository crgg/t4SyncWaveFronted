import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import { cn, formatTime, msToSeconds } from '@shared/utils';
import type { Audio } from '@/features/library/libraryApi';

import spotifyIcon from '@/shared/icons/spotify-icon.svg';

interface TrackListProps {
  tracks: Audio[];
  currentTrackId: string | null;
  onTrackClick: (track: Audio) => void;
  isPlaying: boolean;
}

export function TrackList({ tracks, currentTrackId, onTrackClick, isPlaying }: TrackListProps) {
  if (tracks.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider mb-3">
        TRACKS
      </div>
      <div className="space-y-0.5">
        {tracks.map((track) => {
          const isCurrentTrack = track.id === currentTrackId;
          const displayText =
            track.artist && track.title
              ? (track.title ?? track.artist)
              : track.title || 'Unknown Track';

          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onTrackClick(track)}
              className={cn(
                `
                flex items-center gap-4 p-3 rounded-lg 
                transition-colors cursor-pointer
              `,
                isCurrentTrack
                  ? 'bg-primary-50 dark:bg-primary-900/20'
                  : 'hover:bg-light-hover dark:hover:bg-dark-hover'
              )}
            >
              {isCurrentTrack && isPlaying ? (
                <CurrentTrackIndicator source={track.source} />
              ) : (
                <>
                  {track.source === 'spotify' ? (
                    <img src={spotifyIcon} alt="Spotify" className="w-6 h-6" />
                  ) : (
                    <Music
                      size={20}
                      className={`flex-shrink-0 text-light-text dark:text-zinc-400`}
                    />
                  )}
                </>
              )}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium truncate ${
                    isCurrentTrack
                      ? track.source === 'spotify'
                        ? 'text-spotify-500'
                        : 'text-primary-600 dark:text-primary-400'
                      : 'text-light-text dark:text-zinc-400'
                  }`}
                >
                  {displayText}
                </div>
              </div>
              {track.duration_ms && (
                <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0">
                  {formatTime(msToSeconds(track.duration_ms))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function CurrentTrackIndicator({ source = 'default' }: { source: string }) {
  return (
    <div className="flex items-end gap-0.5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-4 rotate-180">
          <div
            className={cn(
              'current-track-indicator',
              source === 'spotify' ? 'bg-spotify-500' : 'bg-primary-500'
            )}
            style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}
          ></div>
        </div>
      ))}
    </div>
  );
}
