import { motion } from 'framer-motion';
import { Music } from 'lucide-react';

interface EmptyLibraryStateProps {
  onAddTrack: () => void;
}

export function EmptyLibraryState({ onAddTrack }: EmptyLibraryStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="text-6xl">
          <Music
            size={64}
            className="mx-auto text-light-text-secondary dark:text-dark-text-secondary"
          />
        </div>
        <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">No tracks yet</h3>
        <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md">
          Your library is empty. Add some tracks to get started.
        </p>
        <button
          onClick={onAddTrack}
          className="px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
        >
          Add Track
        </button>
      </motion.div>
    </div>
  );
}
