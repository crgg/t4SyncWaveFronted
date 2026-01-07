import { useState, useEffect, useRef, useCallback } from 'react';

interface VolumeSliderProps {
  value: number;
  onChange: (volume: number) => void;
}

export function VolumeSlider({ value, onChange }: VolumeSliderProps) {
  const [localVolume, setLocalVolume] = useState(value * 10);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const volumeInLocalScale = value * 10;
    if (Math.abs(volumeInLocalScale - localVolume) > 10 && volumeInLocalScale !== localVolume) {
      setLocalVolume(volumeInLocalScale);
    }
  }, [value, localVolume]);

  const updateVolumeFromPosition = useCallback(
    (clientX: number) => {
      if (!volumeSliderRef.current) return;

      const rect = volumeSliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const volumeInLocalScale = (percentage / 100) * 1000;

      setLocalVolume(volumeInLocalScale);

      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }

      volumeTimeoutRef.current = setTimeout(() => {
        try {
          const realVolume = volumeInLocalScale / 10;
          onChange(realVolume);
        } catch (error) {
          console.error('Error changing volume:', error);
          setLocalVolume(value * 10);
        }
        volumeTimeoutRef.current = null;
      }, 16);
    },
    [onChange, value]
  );

  const handleVolumeMouseDown = (e: React.MouseEvent) => {
    setIsDraggingVolume(true);
    updateVolumeFromPosition(e.clientX);
  };

  const handleVolumeTouchStart = (e: React.TouchEvent) => {
    setIsDraggingVolume(true);
    if (e.touches[0]) {
      updateVolumeFromPosition(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingVolume) {
        updateVolumeFromPosition(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingVolume(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingVolume && e.touches[0]) {
        e.preventDefault();
        updateVolumeFromPosition(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      setIsDraggingVolume(false);
    };

    if (isDraggingVolume) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingVolume, updateVolumeFromPosition]);

  useEffect(() => {
    return () => {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={volumeSliderRef}
        className="flex-1 h-1 bg-primary-800 dark:bg-dark-hover rounded-lg cursor-pointer relative group transition-colors duration-200"
        onMouseDown={handleVolumeMouseDown}
        onTouchStart={handleVolumeTouchStart}
      >
        <div
          className="absolute h-full bg-light-hover dark:bg-primary-700 rounded-lg transition-all duration-75 ease-out"
          style={{ width: `${localVolume / 10}%` }}
        />
        <div
          className="absolute top-1/2 bg-primary-500 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg border-2 border-light-bg dark:border-dark-bg pointer-events-none z-10"
          style={{ left: `calc(${localVolume / 10}% - 6px)` }}
        />
      </div>
      <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary w-10 text-right transition-colors duration-200">
        {Math.round(localVolume / 10)}%
      </span>
    </>
  );
}
