import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MoveLeft } from 'lucide-react';

import { ThemeToggle } from '@shared/components/ThemeToggle/ThemeToggle';
import { withGuest } from '@/shared/hoc/withGuest';

import logo from '@/app/assets/logo.png';
import { paths } from '@/routes/paths';

export const AuthLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = location.pathname === paths.AUTH;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-light-bg dark:bg-dark-bg transition-colors duration-200">
      <div className="absolute top-4 left-4 right-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            {!isAuthPage && (
              <button
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-extralight underline underline-offset-8 text-zinc-600 dark:text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300"
                onClick={() => navigate(paths.AUTH)}
                type="button"
              >
                <MoveLeft className="inline" size={16} />
                Go to home
              </button>
            )}
          </div>
          <ThemeToggle />
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="py-8 px-4 text-zinc-500 dark:text-zinc-400">
          <div className="flex justify-center mb-4">
            <picture className="rounded-full bg-light-hover/20 dark:bg-light-hover/10 p-6">
              <img src={logo} alt="T4SyncWave" className="sm:w-20 sm:h-20 w-16 h-16" />
            </picture>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text mb-2">
              Welcome to T4SyncWave
            </h1>
          </div>

          <Outlet />
        </div>
      </motion.div>
    </div>
  );
};

export default withGuest(AuthLayout);
