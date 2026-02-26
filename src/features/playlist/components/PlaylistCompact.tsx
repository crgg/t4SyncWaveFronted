import { motion } from 'framer-motion';
import { Music2 } from 'lucide-react';

import { useAppSelector } from '@/app/hooks';
import { useAudio } from '@/shared/hooks/useAudio';
import { formatTime } from '@/shared/utils';
import { playListSelectors } from '../playlistSlice';
import { cn } from '@/shared/utils';

export function PlaylistCompact() {
  const tracks = useAppSelector(playListSelectors.tracks);
  const { trackId: currentTrackId, isPlaying } = useAppSelector((state) => state.audio);
  const { handleSelect, isHost } = useAudio();

  if (tracks.length <= 1) return null;

  const handleTrackClick = (trackId: string) => {
    if (isHost) handleSelect(trackId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-light-card dark:bg-dark-card rounded-xl border border-light-hover dark:border-dark-hover overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-light-hover dark:border-dark-hover">
        <h3 className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
          <Music2 size={16} />
          Playlist ({tracks.length})
        </h3>
      </div>
      <div className="max-h-[240px] overflow-y-auto [overscroll-behavior:contain]">
        {tracks.map((track, index) => {
          const isCurrentTrack = track.id === currentTrackId;
          const isPlayingTrack = isCurrentTrack && isPlaying;

          return (
            <button
              key={track.id}
              type="button"
              onClick={() => handleTrackClick(track.id)}
              disabled={!isHost}
              className={cn(
                'disabled:cursor-default',
                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                isHost && 'hover:bg-light-hover/50 dark:hover:bg-dark-hover/50 cursor-pointer',
                isCurrentTrack && 'bg-light-hover/30 dark:bg-dark-hover/30'
              )}
            >
              <div className="w-12 flex-shrink-0 flex items-center justify-center">
                {isPlayingTrack ? (
                  <div className="flex gap-0.5 items-end h-4">
                    <span className="w-1 rounded-full bg-primary current-track-indicator" />
                    <span
                      className="w-1 rounded-full bg-primary current-track-indicator"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <span
                      className="w-1 rounded-full bg-primary current-track-indicator"
                      style={{ animationDelay: '0.4s' }}
                    />
                  </div>
                ) : isCurrentTrack ? (
                  <div className="w-2 h-2 rounded-full bg-primary/60" />
                ) : (
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {index + 1}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium truncate',
                    isCurrentTrack
                      ? 'text-primary dark:text-primary-light'
                      : 'text-light-text dark:text-dark-text'
                  )}
                >
                  {track.title}
                </p>
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">
                  {track.artist}
                </p>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                {track.duration ? formatTime(track.duration) : '--:--'}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
