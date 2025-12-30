import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { cn } from '@shared/utils';

interface AvatarPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  name?: string;
}

export function AvatarPreview({ isOpen, onClose, imageUrl, name }: AvatarPreviewProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const minScale = 0.5;
  const maxScale = 5;
  const scaleStep = 0.25;

  useEffect(() => {
    if (isOpen) {
      // Reset zoom and position when opening
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + scaleStep, maxScale));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - scaleStep, minScale));
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
    setScale((prev) => Math.max(minScale, Math.min(maxScale, prev + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Preview Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl h-full max-h-[90vh] bg-light-card dark:bg-dark-card rounded-xl shadow-2xl border border-light-hover dark:border-dark-hover pointer-events-auto flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-light-hover dark:border-dark-hover">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
                    {name ? `${name}'s Avatar` : 'Avatar Preview'}
                  </h2>
                  <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    ({Math.round(scale * 100)}%)
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    'text-light-text-secondary dark:text-dark-text-secondary',
                    'hover:bg-light-hover dark:hover:bg-dark-hover',
                    'hover:text-light-text dark:hover:text-dark-text'
                  )}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Image Container */}
              <div
                className="flex-1 overflow-hidden relative flex items-center justify-center bg-gray-100 dark:bg-zinc-900"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
              >
                <img
                  src={imageUrl}
                  alt={name || 'Avatar'}
                  className="max-w-full max-h-full object-contain select-none"
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${position.y / scale}px)`,
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between p-4 border-t border-light-hover dark:border-dark-hover bg-light-surface dark:bg-dark-surface">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleZoomOut}
                    disabled={scale <= minScale}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      'text-light-text-secondary dark:text-dark-text-secondary',
                      'hover:bg-light-hover dark:hover:bg-dark-hover',
                      'hover:text-light-text dark:hover:text-dark-text',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    title="Zoom Out"
                  >
                    <ZoomOut size={20} />
                  </button>

                  <button
                    onClick={handleZoomIn}
                    disabled={scale >= maxScale}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      'text-light-text-secondary dark:text-dark-text-secondary',
                      'hover:bg-light-hover dark:hover:bg-dark-hover',
                      'hover:text-light-text dark:hover:text-dark-text',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    title="Zoom In"
                  >
                    <ZoomIn size={20} />
                  </button>

                  <button
                    onClick={handleRotate}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      'text-light-text-secondary dark:text-dark-text-secondary',
                      'hover:bg-light-hover dark:hover:bg-dark-hover',
                      'hover:text-light-text dark:hover:text-dark-text'
                    )}
                    title="Rotate"
                  >
                    <RotateCw size={20} />
                  </button>

                  <button
                    onClick={handleReset}
                    className={cn(
                      'px-3 py-2 rounded-lg transition-colors text-sm font-medium',
                      'text-light-text-secondary dark:text-dark-text-secondary',
                      'hover:bg-light-hover dark:hover:bg-dark-hover',
                      'hover:text-light-text dark:hover:text-dark-text'
                    )}
                    title="Reset"
                  >
                    Reset
                  </button>
                </div>

                <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                  Use mouse wheel to zoom • Drag to pan when zoomed
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
