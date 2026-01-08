import { useEffect } from 'react';
import { useAudio } from '@shared/hooks/useAudio';
import { formatTime } from '@shared/utils';
import { motion } from 'framer-motion';
import { useAppDispatch } from '@app/hooks';
import { setAudioState } from '@features/audio/audioSlice';
import { getAudioService } from '@services/audio/audioService';
import { STORAGE_KEYS } from '@/shared/constants';
import { VolumeSlider } from './VolumeSlider';
import AudioButtonToggleMuted from './AudioButtonToggleMuted';

interface Props {
  name?: string;
  artist?: string;
}

export function AudioPlayerListener({ name, artist }: Props) {
  const { audioState, setVolume, toggleMute } = useAudio();
  const dispatch = useAppDispatch();

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
    if (audioState.volume !== undefined && audioState.volume >= 0 && audioState.volume <= 100) {
      localStorage.setItem(STORAGE_KEYS.VOLUME, audioState.volume.toString());
    }
  }, [audioState.volume]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.IS_MUTED, audioState.isMuted.toString());
    if (audioState.previousVolume !== undefined) {
      localStorage.setItem(STORAGE_KEYS.PREVIOUS_VOLUME, audioState.previousVolume.toString());
    }
  }, [audioState.isMuted, audioState.previousVolume]);

  const handleVolumeChange = (volume: number) => {
    setVolume(volume);
  };

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
    <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 space-y-6 border border-light-hover dark:border-dark-hover transition-colors duration-200 mb-4">
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

      <div className="text-center text-sm text-zinc-400 transition-colors duration-200">
        Listening mode - You can only control your volume
      </div>
    </div>
  );
}
