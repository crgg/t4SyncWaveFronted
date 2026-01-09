import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import * as Icon from '@/shared/icons/Icons';

import AudioButtonToggleMuted from './AudioButtonToggleMuted';
import { VolumeSlider } from './VolumeSlider';

import { AUDIO_SECONDS } from '@features/audio/utils/constants';
import { getAudioService } from '@services/audio/audioService';
import { groupsApi } from '@features/groups/groupsApi';
import { STORAGE_KEYS } from '@/shared/constants';
import { useAudio } from '@shared/hooks/useAudio';
import { formatTime } from '@shared/utils';

export function AudioPlayerHost() {
  const { audioState, play, pause, seek, setVolume, toggleMute, next, restart, stop } = useAudio();
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const { groupId } = useParams<{ groupId: string }>();

  useEffect(() => {
    const savedVolume = localStorage.getItem(STORAGE_KEYS.VOLUME);
    const savedIsMuted = localStorage.getItem(STORAGE_KEYS.IS_MUTED);
    if (savedVolume) {
      const volume = parseFloat(savedVolume);
      if (!isNaN(volume) && volume >= 0 && volume <= 100) {
        const isMuted = savedIsMuted === 'true';
        const finalVolume = isMuted ? 0 : volume;
        if (Math.abs(finalVolume - (audioState.volume || 100)) > 0.1) {
          setVolume(finalVolume);
        }
        if (isMuted && !audioState.isMuted) {
          toggleMute();
        }
      }
    }
  }, []);

  useEffect(() => {
    // Guardar volumen en localStorage siempre, incluso si es 0
    if (audioState.volume !== undefined && audioState.volume >= 0 && audioState.volume <= 100) {
      localStorage.setItem(STORAGE_KEYS.VOLUME, audioState.volume.toString());
    }
  }, [audioState.volume]);

  // Guardar estado de muted cuando cambia
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IS_MUTED, audioState.isMuted.toString());
    if (audioState.previousVolume !== undefined) {
      localStorage.setItem(STORAGE_KEYS.PREVIOUS_VOLUME, audioState.previousVolume.toString());
    }
  }, [audioState.isMuted, audioState.previousVolume]);

  useEffect(() => {
    if (!isDragging && progressRef.current) {
      const progress = audioState.trackDuration
        ? (audioState.currentPosition / audioState.trackDuration) * 100
        : 0;
      progressRef.current.style.setProperty('--progress', `${progress}%`);
    }
  }, [audioState.currentPosition, audioState.trackDuration, isDragging]);

  useEffect(() => {
    if (
      audioState.isPlaying &&
      audioState.trackDuration &&
      audioState.currentPosition >= audioState.trackDuration - 0.1
    ) {
      seek(0);
      setTimeout(async () => {
        pause();
        try {
          await groupsApi.pause({ groupId: groupId! });
        } catch (error) {
          console.error('Error pausing audio after track ended:', error);
        }
      }, 10);
    }
  }, [
    audioState.isPlaying,
    audioState.currentPosition,
    audioState.trackDuration,
    groupId,
    pause,
    seek,
  ]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const position = parseFloat(e.target.value);
    if (!isNaN(position) && position >= 0 && audioState.trackDuration) {
      const clampedPosition = Math.min(Math.max(0, position), audioState.trackDuration);
      seek(clampedPosition);
    }
  };

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
  };

  const handleVolumeChange = (volume: number) => {
    setVolume(volume);
  };

  const handleSkipForward = () => {
    if (!audioState.trackDuration) return;
    const newPosition = Math.min(audioState.currentPosition + 10, audioState.trackDuration);
    seek(newPosition);
  };

  const handleSkipBackward = () => {
    const newPosition = Math.max(audioState.currentPosition - 10, 0);
    seek(newPosition);
  };

  const handlePlay = async () => {
    play();

    try {
      setTimeout(async () => {
        const currentAudioState = audioState;
        const audioService = getAudioService();
        const audioServiceState = audioService.getState();
        const currentPosition =
          audioServiceState?.currentPosition ?? currentAudioState.currentPosition ?? 0;

        await groupsApi.play({
          groupId: groupId!,
          trackId: currentAudioState.trackId || '',
          startedAt: currentPosition,
        });
      }, 100);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handlePause = async () => {
    pause();

    try {
      setTimeout(async () => {
        if (!groupId) return;
        await groupsApi.pause({ groupId });
      }, 100);
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };

  const progressPercentage = audioState.trackDuration
    ? (audioState.currentPosition / audioState.trackDuration) * 100
    : 0;

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-xl p-3 sm:p-6 space-y-2 border border-light-hover dark:border-dark-hover transition-colors duration-200 mb-4">
      <div className="text-center py-3">
        <motion.h3
          className="text-base sm:text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {audioState.trackTitle || 'No title'}
        </motion.h3>
      </div>

      <div className="space-y-2 w-full">
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
            max={audioState.trackDuration || 100}
            step="0.1"
            value={audioState.currentPosition || 0}
            onChange={handleSeek}
            onMouseDown={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchStart={handleSeekStart}
            onTouchEnd={handleSeekEnd}
            disabled={!audioState.trackDuration}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-30"
            style={{ WebkitAppearance: 'none', appearance: 'none' }}
          />
        </div>
        <div className="flex justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200">
          <span>{formatTime(audioState.currentPosition)}</span>
          <span>{formatTime(audioState.trackDuration || 0)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-7">
        <div className="flex items-center order-2 sm:order-1 justify-center sm:justify-start">
          <div className="flex items-center gap-3 w-full max-w-[160px]">
            <div className="w-5 h-5 flex items-center justify-center">
              <AudioButtonToggleMuted
                volume={audioState.volume || 100}
                isMuted={audioState.isMuted}
                toggleMute={toggleMute}
              />
            </div>
            <div className="flex items-center gap-3 w-full">
              <VolumeSlider
                value={audioState.isMuted ? 0 : audioState.volume || 100}
                onChange={handleVolumeChange}
              />
            </div>
          </div>
        </div>

        <div className="w-full flex items-center order-1 sm:order-2 justify-center gap-1.5 sm:gap-3">
          <div className="w-full flex flex-col items-center order-1 sm:order-2 justify-center gap-1.5 sm:gap-3">
            <div className="flex items-center justify-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={restart}
                disabled={!audioState.trackUrl || audioState.currentPosition === 0}
                className="p-2 rounded-full enabled:hover:bg-light-hover dark:enabled:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Restart"
              >
                <RefreshCw
                  strokeWidth={3}
                  className="text-light-text-secondary dark:text-dark-text-secondary sm:w-4 sm:h-4 w-3 h-3"
                />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSkipBackward}
                disabled={!audioState.trackUrl}
                className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
                title="Rewind 10s"
              >
                <Icon.Rewind className="sm:w-6 sm:h-6 w-4 h-4" />
                <span className="text-xs absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-light-text-secondary dark:text-dark-text-secondary whitespace-nowrap transition-colors duration-200">
                  {AUDIO_SECONDS.SKIP_BACKWARD}s
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={audioState.isPlaying ? handlePause : handlePlay}
                disabled={!audioState.trackUrl}
                className="p-4 rounded-full bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-white"
              >
                {audioState.isPlaying ? (
                  <Icon.Pause className="sm:w-8 sm:h-8 w-6 h-6" />
                ) : (
                  <Icon.Play className="sm:w-8 sm:h-8 w-6 h-6" />
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSkipForward}
                disabled={!audioState.trackUrl}
                className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
                title="Forward 10s"
              >
                <Icon.Fordward className="sm:w-6 sm:h-6 w-4 h-4" />
                <span className="text-xs absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200">
                  {AUDIO_SECONDS.SKIP_BACKWARD}s
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={next}
                disabled={!audioState.trackUrl}
                className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50 hidden"
                title="Next"
              >
                <Icon.Next className="sm:w-5 sm:h-5 w-3 h-3" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full enabled:hover:bg-light-hover dark:enabled:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!audioState.trackUrl || audioState.currentPosition === 0}
                onClick={stop}
                title="Stop"
              >
                <Icon.Stop className="sm:w-5 sm:h-5 w-3 h-3" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
