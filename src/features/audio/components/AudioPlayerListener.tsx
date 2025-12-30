import { useState, useEffect, useRef } from 'react';
import { useAudio } from '@shared/hooks/useAudio';
import { formatTime } from '@shared/utils';
import { motion } from 'framer-motion';
import { useAppDispatch } from '@app/hooks';
import { setAudioState } from '@features/audio/audioSlice';
import { getAudioService } from '@services/audio/audioService';
import { STORAGE_KEYS } from '@/shared/constants';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  name?: string;
  artist?: string;
}

export function AudioPlayerListener({ name, artist }: Props) {
  const { audioState, setVolume, toggleMute } = useAudio();
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const [localVolume, setLocalVolume] = useState(
    audioState.isMuted ? 0 : audioState.volume || 100
  );
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedVolume = localStorage.getItem(STORAGE_KEYS.VOLUME);
    const savedIsMuted = localStorage.getItem(STORAGE_KEYS.IS_MUTED);
    if (savedVolume) {
      const volume = parseFloat(savedVolume);
      if (!isNaN(volume) && volume >= 0 && volume <= 100) {
        const isMuted = savedIsMuted === 'true';
        // Si está guardado como muted, el volumen debería ser 0
        const finalVolume = isMuted ? 0 : volume;
        setLocalVolume(finalVolume);
        if (Math.abs(finalVolume - (audioState.volume || 100)) > 0.1) {
          setVolume(finalVolume);
        }
        // Si está muted pero el estado no lo refleja, hacer toggle mute
        if (isMuted && !audioState.isMuted) {
          toggleMute();
        }
      }
    }
  }, []);

  useEffect(() => {
    if (
      audioState.volume !== undefined &&
      Math.abs(audioState.volume - localVolume) > 1 &&
      audioState.volume !== localVolume
    ) {
      setLocalVolume(audioState.volume);
    }
  }, [audioState.volume, localVolume]);

  // Guardar volumen en localStorage cuando cambia (incluso si es 0)
  useEffect(() => {
    if (localVolume >= 0 && localVolume <= 100) {
      localStorage.setItem(STORAGE_KEYS.VOLUME, localVolume.toString());
    }
  }, [localVolume]);

  // Guardar estado de muted cuando cambia
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IS_MUTED, audioState.isMuted.toString());
    if (audioState.previousVolume !== undefined) {
      localStorage.setItem(STORAGE_KEYS.PREVIOUS_VOLUME, audioState.previousVolume.toString());
    }
  }, [audioState.isMuted, audioState.previousVolume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    if (isNaN(volume) || volume < 0 || volume > 100) return;

    setLocalVolume(volume);

    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }

    volumeTimeoutRef.current = setTimeout(() => {
      try {
        setVolume(volume);
      } catch (error) {
        console.error('Error al cambiar volumen:', error);
        setLocalVolume(audioState.volume || 100);
      }
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

  useEffect(() => {
    if (!audioState.trackDuration && audioState.trackUrl) {
      const audioService = getAudioService();
      const audioServiceState = audioService.getState();

      if (audioServiceState?.trackDuration && audioServiceState.trackDuration > 0) {
        dispatch(
          setAudioState({
            ...audioState,
            trackDuration: audioServiceState.trackDuration,
          })
        );
        return;
      }

      const audioElement = (audioService as any).audioElement as HTMLAudioElement | null;
      if (audioElement && !isNaN(audioElement.duration) && audioElement.duration > 0) {
        dispatch(
          setAudioState({
            ...audioState,
            trackDuration: audioElement.duration,
          })
        );
      }
    }
  }, [audioState.trackDuration, audioState.trackUrl, audioState, dispatch]);

  const progressPercentage = audioState.trackDuration
    ? (audioState.currentPosition / audioState.trackDuration) * 100
    : 0;

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-2xl p-6 space-y-6 mt-6 border border-light-hover dark:border-dark-hover transition-colors duration-200">
      <div className="text-center">
        <h3 className="text-xl font-bold text-light-text dark:text-dark-text mb-1 transition-colors duration-200">
          {name ?? audioState.trackTitle ?? 'No title'}
        </h3>
        {artist ||
          (audioState.trackArtist && (
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200">
              {artist ?? audioState.trackArtist ?? 'No artist'}
            </p>
          ))}
      </div>

      <div className="space-y-2">
        <div className="relative h-2 bg-light-hover dark:bg-dark-hover rounded-full overflow-hidden transition-colors duration-200">
          <div className="absolute inset-0 bg-light-hover dark:bg-dark-hover rounded-full transition-colors duration-200" />
          <motion.div
            className="absolute h-full bg-primary-600 rounded-full pointer-events-none"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{
              duration: 0.1,
              ease: 'linear',
              type: 'tween',
            }}
            key={`progress-${audioState.trackId}`}
          />
        </div>
        <div className="flex justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200">
          <span>{formatTime(audioState.currentPosition)}</span>
          <span>{formatTime(audioState.trackDuration || 0)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="flex items-center gap-3 px-4 py-2 bg-light-surface dark:bg-dark-surface rounded-full transition-colors duration-200">
          {audioState.isPlaying ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-3 h-3 bg-primary-600 rounded-full"
              />
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200">
                Playing
              </span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-light-text-secondary dark:bg-dark-text-secondary rounded-full transition-colors duration-200" />
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200">
                Paused
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMute}
          className="p-1 rounded-full hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
          title={audioState.isMuted ? 'Unmute' : 'Mute'}
        >
          <svg
            className={`w-5 h-5 transition-colors duration-200 ${
              audioState.isMuted
                ? 'text-red-600 dark:text-red-400'
                : 'text-light-text-secondary dark:text-dark-text-secondary'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            {audioState.isMuted ? (
              // Icono de altavoz sin rayas cuando está mute (en rojo)
              <path
                fillRule="evenodd"
                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793z"
                clipRule="evenodd"
              />
            ) : localVolume === 0 ? (
              // Sin rayas cuando volumen es 0
              <path
                fillRule="evenodd"
                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793z"
                clipRule="evenodd"
              />
            ) : localVolume < 50 ? (
              // Una raya cuando volumen es bajo
              <path
                fillRule="evenodd"
                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            ) : (
              // Tres rayas cuando volumen es alto
              <path
                fillRule="evenodd"
                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                clipRule="evenodd"
              />
            )}
          </svg>
        </motion.button>
        <input
          type="range"
          min="0"
          max="100"
          value={localVolume}
          onChange={handleVolumeChange}
          className="flex-1 h-1 bg-light-hover dark:bg-dark-hover rounded-lg appearance-none cursor-pointer accent-primary-600 transition-colors duration-200"
          style={{
            background: `linear-gradient(to right, #8c7f49 0%, #8c7f49 ${localVolume}%, ${
              theme === 'dark' ? '#2a2a2a' : '#e9ecef'
            } ${localVolume}%, ${theme === 'dark' ? '#2a2a2a' : '#e9ecef'} 100%)`,
          }}
        />
        <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary w-10 text-right transition-colors duration-200">
          {Math.round(localVolume)}%
        </span>
      </div>

      <div className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200">
        Listening mode - You can only control your volume
      </div>
    </div>
  );
}
