import { motion } from 'framer-motion';

interface ProfileMessagesProps {
  error: string | null;
  success: string | null;
}

export function ProfileMessages({ error, success }: ProfileMessagesProps) {
  return (
    <>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 sm:p-4 rounded-xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30"
        >
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 sm:p-4 rounded-xl bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 dark:border-green-500/30"
        >
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </motion.div>
      )}
    </>
  );
}
