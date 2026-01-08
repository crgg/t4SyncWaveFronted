import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

import { formatTime } from '@shared/utils';
import { useTheme } from '@/contexts/ThemeContext';

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
    <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-lg p-6 space-y-6 border border-light-hover dark:border-dark-hover transition-colors duration-200 mb-4">
      <div className="text-center">
        <motion.h3
          className="text-xl font-bold text-light-text dark:text-dark-text mb-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {trackTitle || 'Sin título'}
        </motion.h3>
        {trackArtist && (
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {trackArtist}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="relative h-2 bg-light-hover dark:bg-dark-hover rounded-full overflow-hidden group">
          <div className="absolute inset-0 bg-light-hover dark:bg-dark-hover rounded-full" />

          <motion.div
            ref={progressRef}
            className="absolute h-full bg-primary-600 dark:bg-primary-500 rounded-full pointer-events-none"
            initial={{ width: 0 }}
            animate={{
              width: `${progressPercentage}%`,
            }}
            transition={{
              duration: isDragging ? 0 : 0.1,
              ease: 'linear',
            }}
          />

          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary-600 dark:bg-primary-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border-2 border-light-bg dark:border-dark-bg pointer-events-none z-10"
            style={{ left: `calc(${progressPercentage}% - 8px)` }}
            initial={{ scale: 0 }}
            whileHover={{ scale: 1.2 }}
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

      <div className="flex items-center justify-center gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onNextTrack}
          disabled={!hasNextTrack}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous"
        >
          <svg
            className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onSkipBackward}
          disabled={!trackDuration}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
          title="Rewind 10s"
        >
          <svg
            className="w-6 h-6 text-light-text-secondary dark:text-dark-text-secondary"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
          </svg>
          <span className="text-xs absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-light-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
            10s
          </span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={isPlaying ? onPause : onPlay}
          disabled={!trackDuration}
          className="p-4 rounded-full bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {isPlaying ? (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onSkipForward}
          disabled={!trackDuration}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
          title="Forward 10s"
        >
          <svg
            className="w-6 h-6 text-light-text-secondary dark:text-dark-text-secondary"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0011 6v2.798l-5.445-3.63z" />
          </svg>
          <span className="text-xs absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-light-text-secondary dark:text-dark-text-secondary">
            10s
          </span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onPreviousTrack}
          disabled={!hasPreviousTrack}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next"
        >
          <svg
            className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </motion.button>
      </div>

      <div className="flex items-center gap-3">
        <svg
          className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          {localVolume === 0 ? (
            <path
              fillRule="evenodd"
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
              clipRule="evenodd"
            />
          ) : localVolume < 50 ? (
            <path
              fillRule="evenodd"
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          ) : (
            <path
              fillRule="evenodd"
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
              clipRule="evenodd"
            />
          )}
        </svg>
        <input
          type="range"
          min="0"
          max="100"
          value={localVolume}
          onChange={handleVolumeChange}
          className="flex-1 h-1 bg-light-hover dark:bg-dark-hover rounded-lg appearance-none cursor-pointer accent-primary-600 transition-colors duration-200"
          style={{
            background: `linear-gradient(to right, #C5A059 0%, #C5A059 ${localVolume}%, ${
              theme === 'dark' ? '#2a2516' : '#E2C285'
            } ${localVolume}%, ${theme === 'dark' ? '#2a2516' : '#E2C285'} 100%)`,
          }}
        />
        <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary w-10 text-right">
          {Math.round(localVolume)}%
        </span>
      </div>
    </div>
  );
}
