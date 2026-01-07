import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import { formatTime, msToSeconds } from '@shared/utils';
import type { Audio } from '@/features/library/libraryApi';

interface TrackListProps {
  tracks: Audio[];
  currentTrackId: string | null;
  onTrackClick: (track: Audio) => void;
}

export function TrackList({ tracks, currentTrackId, onTrackClick }: TrackListProps) {
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
              className={`
                flex items-center gap-4 p-3 rounded-lg 
                transition-colors cursor-pointer
                ${isCurrentTrack ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-light-surface dark:hover:bg-dark-surface'}
              `}
            >
              <Music
                size={20}
                className={`flex-shrink-0 ${
                  isCurrentTrack
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-light-text dark:text-dark-text'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium truncate ${
                    isCurrentTrack
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-light-text dark:text-dark-text'
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
