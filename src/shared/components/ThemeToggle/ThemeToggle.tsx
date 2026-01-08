import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-7 rounded-full bg-zinc-300 dark:bg-zinc-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
      aria-label="Toggle theme"
    >
      <motion.div
        className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center"
        animate={{
          x: theme === 'dark' ? 0 : 13,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
      >
        {theme === 'dark' ? (
          <Moon size={16} className="text-gray-800" />
        ) : (
          <Sun size={16} className="text-yellow-500" />
        )}
      </motion.div>
    </button>
  );
}
