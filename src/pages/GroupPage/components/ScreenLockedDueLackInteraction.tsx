import { Volume2, MousePointerClick } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { AudioState } from '@shared/types';

interface Props {
  handleAudioInteraction: () => void;
  role?: string;
  needsInteraction: boolean;
  audioState: AudioState;
}

export const ScreenLockedDueLackInteraction = ({
  handleAudioInteraction,
  needsInteraction,
  audioState,
}: Props) => {
  return (
    <AnimatePresence>
      {needsInteraction && audioState.trackUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleAudioInteraction}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-light-card dark:bg-dark-card rounded-2xl p-8 max-w-md mx-4 border border-light-hover dark:border-dark-hover shadow-2xl cursor-pointer hover:scale-105 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              handleAudioInteraction();
            }}
          >
            <div className="text-center space-y-4">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="flex justify-center"
              >
                <div className="relative">
                  <Volume2 size={64} className="text-primary-600 dark:text-primary-400 mx-auto" />
                  <motion.div
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 bg-primary-600/30 dark:bg-primary-400/30 rounded-full blur-xl"
                  />
                </div>
              </motion.div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
                  Audio blocked
                </h3>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Click anywhere on the screen to enable audio playback
                </p>
              </div>

              <motion.div
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="flex items-center justify-center gap-2 text-primary-600 dark:text-primary-400"
              >
                <MousePointerClick size={20} />
                <span className="text-sm font-medium">Click here</span>
              </motion.div>

              {audioState.trackTitle ||
                (audioState.trackUrl && (
                  <div className="pt-4 border-t border-light-hover dark:border-dark-hover">
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      Playing:
                    </p>
                    <p className="text-sm font-medium text-light-text dark:text-dark-text mt-1">
                      {audioState.trackTitle || audioState.trackUrl}
                    </p>
                  </div>
                ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
