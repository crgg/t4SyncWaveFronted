import { motion } from 'framer-motion';
import { Home, ArrowLeft, Users, Headphones, Music2, Inbox } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@shared/components/Button/Button';
import { useAppSelector } from '@/app/hooks';
import { paths } from '@/routes/paths';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg px-4 transition-colors duration-200">
      <div className="max-w-2xl w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="text-5xl sm:text-9xl font-bold text-primary-500 dark:text-primary-400"
            >
              404
            </motion.div>
            <h1 className="text-lg sm:text-4xl font-bold text-light-text dark:text-dark-text">
              Page Not Found
            </h1>
            <p className="text-sm sm:text-lg text-light-text-secondary dark:text-dark-text-secondary max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved. Let's get you back on
              track!
            </p>
          </div>

          <div className="flex gap-2 sm:gap-4 justify-center items-center">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <ArrowLeft size={16} />
              Go Back
            </Button>
            <Button
              onClick={() => navigate(paths.HOME)}
              variant="primary"
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <Home size={16} />
              Go Home
            </Button>
          </div>
          {isAuthenticated ? (
            <>
              <div className="pt-8 border-t border-light-hover dark:border-dark-hover">
                <h2 className="text-lg sm:text-xl font-semibold text-light-text dark:text-dark-text mb-3 sm:mb-6">
                  {isAuthenticated ? 'Quick Links' : 'Get Started'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Link
                    to={paths.GROUPS(null)}
                    className="group p-2 sm:p-4 rounded-xl bg-light-card dark:bg-dark-card border border-light-hover dark:border-dark-hover hover:border-primary-500/30 dark:hover:border-primary-400/50 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary-500/10 dark:bg-primary-400/10 group-hover:bg-primary-500/20 dark:group-hover:bg-primary-400/20 transition-colors">
                        <Users size={20} className="text-primary-500 dark:text-primary-400" />
                      </div>
                      <div className="text-start">
                        <h3 className="font-semibold text-light-text dark:text-dark-text text-xs sm:text-sm">
                          My Groups
                        </h3>
                        <p className="text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          View and manage your music groups
                        </p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    to={paths.LISTENERS(null)}
                    className="group p-2 sm:p-4 rounded-xl bg-light-card dark:bg-dark-card border border-light-hover dark:border-dark-hover hover:border-primary-500/30 dark:hover:border-primary-400/50 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary-500/10 dark:bg-primary-400/10 group-hover:bg-primary-500/20 dark:group-hover:bg-primary-400/20 transition-colors">
                        <Headphones size={20} className="text-primary-500 dark:text-primary-400" />
                      </div>
                      <div className="text-start">
                        <h3 className="font-semibold text-light-text dark:text-dark-text text-xs sm:text-sm">
                          Listeners
                        </h3>
                        <p className="text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          View and manage your listeners
                        </p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    to={paths.LIBRARY}
                    className="group p-2 sm:p-4 rounded-xl bg-light-card dark:bg-dark-card border border-light-hover dark:border-dark-hover hover:border-primary-500/30 dark:hover:border-primary-400/50 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary-500/10 dark:bg-primary-400/10 group-hover:bg-primary-500/20 dark:group-hover:bg-primary-400/20 transition-colors">
                        <Music2 size={20} className="text-primary-500 dark:text-primary-400" />
                      </div>
                      <div className="text-start">
                        <h3 className="font-semibold text-light-text dark:text-dark-text text-xs sm:text-sm">
                          Library
                        </h3>
                        <p className="text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          View and manage your tracks
                        </p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    to={paths.INBOX}
                    className="group p-2 sm:p-4 rounded-xl bg-light-card dark:bg-dark-card border border-light-hover dark:border-dark-hover hover:border-primary-500/30 dark:hover:border-primary-400/50 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary-500/10 dark:bg-primary-400/10 group-hover:bg-primary-500/20 dark:group-hover:bg-primary-400/20 transition-colors">
                        <Inbox size={20} className="text-primary-500 dark:text-primary-400" />
                      </div>
                      <div className="text-start">
                        <h3 className="font-semibold text-light-text dark:text-dark-text text-xs sm:text-sm">
                          Inbox
                        </h3>
                        <p className="text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          View and manage your invitations
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
