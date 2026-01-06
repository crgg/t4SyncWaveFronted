import { useState, useEffect, useRef } from 'react';
import { useAudio } from '@shared/hooks/useAudio';
import { formatTime } from '@shared/utils';
import { motion } from 'framer-motion';
import { STORAGE_KEYS } from '@/shared/constants';
import { CirclePlay, Pause } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { groupsApi } from '@/features/groups/groupsApi';
import { VolumeSlider } from './VolumeSlider';
import AudioButtonToggleMuted from './AudioButtonToggleMuted';
import { getAudioService } from '@services/audio/audioService';

export function AudioPlayerHost() {
  const { audioState, play, pause, seek, setVolume, toggleMute, next, restart } = useAudio();
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

        const resp = await groupsApi.play({
          groupId: groupId!,
          trackId: currentAudioState.trackId || '',
          startedAt: currentPosition,
        });
        console.log({ resp });
      }, 100);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handlePause = async () => {
    // Primero ejecutar pause localmente
    pause();

    try {
      // Obtener el estado actualizado del audio después de pause()
      // Esperar un momento para que el estado se actualice
      setTimeout(async () => {
        const resp = await groupsApi.pause({
          groupId: groupId!,
        });
        console.log({ resp });
      }, 100);
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };

  const progressPercentage = audioState.trackDuration
    ? (audioState.currentPosition / audioState.trackDuration) * 100
    : 0;

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 space-y-6 border border-light-hover dark:border-dark-hover transition-colors duration-200 mb-4">
      <div className="text-center">
        <motion.h3
          className="text-xl font-bold text-light-text dark:text-dark-text mb-1 transition-colors duration-200"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {audioState.trackTitle || 'No title'}
        </motion.h3>
        {audioState.trackArtist && (
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200">
            {audioState.trackArtist}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="relative h-2 bg-light-hover dark:bg-dark-hover rounded-full overflow-hidden group transition-colors duration-200">
          <div className="absolute inset-0 bg-light-hover dark:bg-dark-hover rounded-full transition-colors duration-200" />
          <motion.div
            ref={progressRef}
            className="absolute h-full bg-primary-600 rounded-full pointer-events-none"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: isDragging ? 0 : 0.1, ease: 'linear' }}
          />
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg border-2 border-light-bg dark:border-dark-bg pointer-events-none z-10"
            style={{ left: `calc(${progressPercentage}% - 8px)` }}
            initial={{ scale: 0 }}
            whileHover={{ scale: 1.2 }}
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

      <div className="flex items-center justify-center gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={restart}
          disabled={!audioState.trackUrl}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Restart"
        >
          <svg
            className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSkipBackward}
          disabled={!audioState.trackUrl}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
          title="Rewind 10s"
        >
          <svg
            className="w-6 h-6 text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
          </svg>
          <span className="text-xs absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-light-text-secondary dark:text-dark-text-secondary whitespace-nowrap transition-colors duration-200">
            10s
          </span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={audioState.isPlaying ? handlePause : handlePlay}
          disabled={!audioState.trackUrl}
          className="p-4 rounded-full bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-white"
        >
          {!audioState.isPlaying ? <CirclePlay size={28} /> : <Pause size={28} />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSkipForward}
          disabled={!audioState.trackUrl}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
          title="Forward 10s"
        >
          <svg
            className="w-6 h-6 text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0011 6v2.798l-5.445-3.63z" />
          </svg>
          <span className="text-xs absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200">
            10s
          </span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={next}
          disabled={!audioState.trackUrl}
          className="p-2 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
          title="Next"
        >
          <svg
            className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200"
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
        <AudioButtonToggleMuted
          volume={audioState.volume || 100}
          isMuted={audioState.isMuted}
          toggleMute={toggleMute}
        />
        <VolumeSlider
          value={audioState.isMuted ? 0 : audioState.volume || 100}
          onChange={handleVolumeChange}
        />
      </div>
    </div>
  );
}
