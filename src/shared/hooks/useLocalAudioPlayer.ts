import { useState, useEffect, useRef, useCallback } from 'react';
import { msToSeconds } from '@shared/utils';
import { STORAGE_KEYS } from '@shared/constants';
import { AUDIO_SECONDS } from '@/features/audio/utils/constants';

interface LocalAudioState {
  isPlaying: boolean;
  currentPosition: number;
  trackDuration: number;
  volume: number;
  trackId: string | null;
  trackUrl: string | null;
  trackTitle?: string;
  trackArtist?: string;
}

interface UseLocalAudioPlayerReturn {
  audioState: LocalAudioState;
  play: () => void;
  pause: () => void;
  seek: (position: number) => void;
  setVolume: (volume: number) => void;
  setTrack: (
    track: {
      id: string;
      url: string;
      title?: string;
      artist?: string;
      duration_ms?: number;
    },
    isPlaying?: boolean
  ) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
}

// Initialize volume from localStorage
const getInitialVolume = () => {
  const savedVolume = localStorage.getItem(STORAGE_KEYS.VOLUME);
  if (savedVolume) {
    const volume = parseFloat(savedVolume);
    if (!isNaN(volume) && volume >= 0 && volume <= 100) {
      return volume;
    }
  }
  return 100;
};

export function useLocalAudioPlayer(
  tracks: Array<{
    id: string;
    file_url: string;
    title?: string;
    artist?: string;
    duration_ms?: number;
  }>
): UseLocalAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const initialVolume = getInitialVolume();

  const [audioState, setAudioState] = useState<LocalAudioState>({
    isPlaying: false,
    currentPosition: 0,
    trackDuration: 0,
    volume: initialVolume,
    trackId: null,
    trackUrl: null,
  });

  // Inicializar audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = initialVolume / 100;
    }

    const audio = audioRef.current;

    const updateTime = () => {
      if (audio) {
        setAudioState((prev) => ({
          ...prev,
          currentPosition: audio.currentTime,
        }));
      }
    };

    const handleLoadedMetadata = () => {
      if (audio) {
        setAudioState((prev) => ({
          ...prev,
          trackDuration: audio.duration || 0,
        }));
      }
    };

    const handleEnded = () => {
      setAudioState((prev) => ({
        ...prev,
        isPlaying: false,
        currentPosition: 0,
      }));
      // Auto-play siguiente track si existe
      if (currentTrackIndex !== null && currentTrackIndex < tracks.length - 1) {
        const nextIndex = currentTrackIndex + 1;
        setCurrentTrackIndex(nextIndex);
        const nextTrack = tracks[nextIndex];
        if (nextTrack) {
          setTrack({
            id: nextTrack.id,
            url: nextTrack.file_url,
            title: nextTrack.title,
            artist: nextTrack.artist,
            duration_ms: nextTrack.duration_ms,
          });
          setTimeout(() => play(), 100);
        }
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex, tracks]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const setTrack = useCallback(
    (
      track: { id: string; url: string; title?: string; artist?: string; duration_ms?: number },
      isPlaying: boolean = false
    ) => {
      if (!audioRef.current) return;

      const audio = audioRef.current;
      const index = tracks.findIndex((t) => t.id === track.id);
      setCurrentTrackIndex(index !== -1 ? index : null);

      audio.src = track.url;
      audio.load();

      if (isPlaying) {
        audio
          .play()
          .then(() => {
            console.log('playing audio');
            setAudioState((prev) => ({ ...prev, isPlaying: true }));
          })
          .catch((error) => {
            console.error('Error playing audio:', error);
            setAudioState((prev) => ({ ...prev, isPlaying: false }));
          });
      }

      setAudioState((prev) => ({
        ...prev,
        trackId: track.id,
        trackUrl: track.url,
        trackTitle: track.title,
        trackArtist: track.artist,
        trackDuration: track.duration_ms ? msToSeconds(track.duration_ms) : 0,
        currentPosition: 0,
      }));
    },
    [tracks]
  );

  const play = useCallback(() => {
    if (!audioRef.current || !audioState.trackUrl) return;

    audioRef.current
      .play()
      .then(() => {
        setAudioState((prev) => ({ ...prev, isPlaying: true }));
      })
      .catch((error) => {
        console.error('Error playing audio:', error);
        setAudioState((prev) => ({ ...prev, isPlaying: false }));
      });
  }, [audioState.trackUrl]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setAudioState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const seek = useCallback(
    (position: number) => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = Math.max(0, Math.min(position, audioState.trackDuration || 0));
      setAudioState((prev) => ({ ...prev, currentPosition: position }));
    },
    [audioState.trackDuration]
  );

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume / 100;
    }
    // Save volume to localStorage
    localStorage.setItem(STORAGE_KEYS.VOLUME, clampedVolume.toString());
    setAudioState((prev) => ({ ...prev, volume: clampedVolume }));
  }, []);

  const nextTrack = useCallback(() => {
    if (currentTrackIndex === null || currentTrackIndex >= tracks.length - 1) return;

    const nextIndex = currentTrackIndex + 1;
    const nextTrack = tracks[nextIndex];
    if (nextTrack) {
      setCurrentTrackIndex(nextIndex);
      setTrack({
        id: nextTrack.id,
        url: nextTrack.file_url,
        title: nextTrack.title,
        artist: nextTrack.artist,
        duration_ms: nextTrack.duration_ms,
      });
      setTimeout(() => play(), 100);
    }
  }, [currentTrackIndex, tracks, setTrack, play]);

  const previousTrack = useCallback(() => {
    if (currentTrackIndex === null || currentTrackIndex <= 0) return;

    const prevIndex = currentTrackIndex - 1;
    const prevTrack = tracks[prevIndex];
    if (prevTrack) {
      setCurrentTrackIndex(prevIndex);
      setTrack({
        id: prevTrack.id,
        url: prevTrack.file_url,
        title: prevTrack.title,
        artist: prevTrack.artist,
        duration_ms: prevTrack.duration_ms,
      });
      setTimeout(() => play(), 100);
    }
  }, [currentTrackIndex, tracks, setTrack, play]);

  const skipForward = useCallback(
    (seconds: number = AUDIO_SECONDS.SKIP_FORWARD) => {
      console.log({
        currentTime: audioRef.current?.currentTime,
        duration: audioRef.current?.duration,
        trackDuration: audioState.trackDuration,
        seconds,
      });
      if (!audioRef.current) return;
      const currentTime = audioRef.current.currentTime || 0;
      const duration = audioRef.current.duration || audioState.trackDuration || 0;
      const newPosition = Math.min(currentTime + seconds, duration);
      seek(newPosition);
    },
    [audioState.trackDuration, seek]
  );

  const skipBackward = useCallback(
    (seconds: number = AUDIO_SECONDS.SKIP_BACKWARD) => {
      if (!audioRef.current) return;
      const currentTime = audioRef.current.currentTime || 0;
      const newPosition = Math.max(currentTime - seconds, 0);
      seek(newPosition);
    },
    [seek]
  );

  return {
    audioState,
    play,
    pause,
    seek,
    setVolume,
    setTrack,
    nextTrack,
    previousTrack,
    skipForward,
    skipBackward,
  };
}
