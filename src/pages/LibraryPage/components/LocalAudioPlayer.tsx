import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

import { formatTime } from '@shared/utils';
import { useTheme } from '@/contexts/ThemeContext';
import * as Icon from '@/shared/icons/Icons';
import { AUDIO_SECONDS } from '@/features/audio/utils/constants';

interface LocalAudioPlayerProps {
  isPlaying: boolean;
  currentPosition: number;
  trackDuration: number;
  trackTitle?: string;
  trackArtist?: string;
  volume: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (position: number) => void;
  onVolumeChange: (volume: number) => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onNextTrack: () => void;
  onPreviousTrack: () => void;
  hasNextTrack: boolean;
  hasPreviousTrack: boolean;
}

export function LocalAudioPlayer({
  isPlaying,
  currentPosition,
  trackDuration,
  trackTitle,
  trackArtist,
  volume,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onSkipForward,
  onSkipBackward,
  onNextTrack,
  onPreviousTrack,
  hasNextTrack,
  hasPreviousTrack,
}: LocalAudioPlayerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!isDragging && progressRef.current) {
      const progress = trackDuration ? (currentPosition / trackDuration) * 100 : 0;
      progressRef.current.style.setProperty('--progress', `${progress}%`);
    }
  }, [currentPosition, trackDuration, isDragging]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const position = parseFloat(e.target.value);
    if (!isNaN(position) && position >= 0 && trackDuration) {
      const clampedPosition = Math.min(Math.max(0, position), trackDuration);
      onSeek(clampedPosition);
    }
  };

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (isNaN(newVolume) || newVolume < 0 || newVolume > 100) return;

    setLocalVolume(newVolume);

    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }

    volumeTimeoutRef.current = setTimeout(() => {
      onVolumeChange(newVolume);
      volumeTimeoutRef.current = null;
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
    };
  }, []);

  const progressPercentage = trackDuration ? (currentPosition / trackDuration) * 100 : 0;

  if (!trackTitle && !trackArtist) {
    return null;
  }

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-xl shadow sm:shadow-lg p-3 sm:p-6 space-y-2 border border-light-hover dark:border-dark-hover transition-colors duration-200 mb-4">
      <div className="text-center py-3">
        <motion.h3
          className="text-base sm:text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {trackTitle || 'No title'}
        </motion.h3>
      </div>

      <div className="space-y-2">
        <div className="relative h-2 rounded-full overflow-hidden group">
          <div className="absolute inset-0 bg-zinc-200 dark:bg-dark-hover rounded-full" />

          <motion.div
            ref={progressRef}
            className="absolute h-full bg-primary-700 rounded-full pointer-events-none"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: isDragging ? 0 : 0.1, ease: 'linear' }}
          />

          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border-2 border-light-bg dark:border-dark-bg pointer-events-none z-10"
            style={{ left: `calc(${progressPercentage}% - 8px)` }}
            whileHover={{ scale: 1.2 }}
            initial={{ scale: 0 }}
          />

          <input
            type="range"
            min="0"
            max={trackDuration || 100}
            step="0.1"
            value={currentPosition || 0}
            onChange={handleSeek}
            onMouseDown={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchStart={handleSeekStart}
            onTouchEnd={handleSeekEnd}
            disabled={!trackDuration}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-30"
            style={{ WebkitAppearance: 'none', appearance: 'none' }}
          />
        </div>
        <div className="flex justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary">
          <span>{formatTime(currentPosition)}</span>
          <span>{formatTime(trackDuration || 0)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-7">
        <div className="flex items-center order-2 sm:order-1 justify-center sm:justify-start">
          <div className="flex items-center gap-3 w-full max-w-[160px]">
            <div className="w-5 h-5">
              <Icon.Volumen className="sm:w-5 sm:h-5 w-4 h-4" volume={localVolume} />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={localVolume}
              onChange={handleVolumeChange}
              className="flex-1 h-1 w-full bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary-600 transition-colors duration-200"
              style={{
                background: `linear-gradient(to right, #C5A059 0%, #C5A059 ${localVolume}%, ${
                  theme === 'dark' ? '#2a2516' : '#e4e4e7'
                } ${localVolume}%, ${theme === 'dark' ? '#2a2516' : '#e4e4e7'} 100%)`,
              }}
            />
            <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 w-10">
              {Math.round(localVolume)}%
            </span>
          </div>
        </div>

        <div className="flex items-center order-1 sm:order-2 justify-center gap-1.5 sm:gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onNextTrack}
            disabled={!hasNextTrack}
            className="p-2 rounded-full enabled:hover:bg-light-hover dark:enabled:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous"
          >
            <Icon.Previous className="sm:w-5 sm:h-5 w-3 h-3" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSkipBackward()}
            disabled={!trackDuration}
            className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
            title="Rewind 10s"
          >
            <Icon.Rewind className="sm:w-6 sm:h-6 w-4 h-4" />
            <span className="text-xs absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-light-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
              {AUDIO_SECONDS.SKIP_BACKWARD}s
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={isPlaying ? onPause : onPlay}
            disabled={!trackDuration}
            className="p-3.5 sm:p-4 rounded-full bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isPlaying ? (
              <Icon.Pause className="sm:w-8 sm:h-8 w-6 h-6" />
            ) : (
              <Icon.Play className="sm:w-8 sm:h-8 w-6 h-6" />
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSkipForward()}
            disabled={!trackDuration}
            className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
            title="Forward 10s"
          >
            <Icon.Fordward className="sm:w-6 sm:h-6 w-4 h-4" />
            <span className="text-xs absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-light-text-secondary dark:text-dark-text-secondary">
              {AUDIO_SECONDS.SKIP_FORWARD}s
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onPreviousTrack}
            disabled={!hasPreviousTrack}
            className="p-2 rounded-full enabled:hover:bg-light-hover dark:enabled:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next"
          >
            <Icon.Next className="sm:w-5 sm:h-5 w-3 h-3" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
