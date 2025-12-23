import { motion } from 'framer-motion';
import { Home, ArrowLeft, Music, Users, LogIn, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { Button } from '@shared/components/Button/Button';
import { paths } from '@/routes/paths';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-background dark:bg-dark-background px-4">
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
              className="text-9xl font-bold text-primary-600 dark:text-primary-400"
            >
              404
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold text-light-text dark:text-dark-text">
              Page Not Found
            </h1>
            <p className="text-lg text-light-text-secondary dark:text-dark-text-secondary max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved. Let's get you back on
              track!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Go Back
            </Button>
            <Button
              onClick={() => navigate(paths.HOME)}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Home size={18} />
              Go Home
            </Button>
          </div>

          <div className="pt-8 border-t border-light-hover dark:border-dark-hover">
            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-6">
              {isAuthenticated ? 'Quick Links' : 'Get Started'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isAuthenticated ? (
                <>
                  <Link
                    to={paths.GROUPS(null)}
                    className="group p-4 rounded-xl bg-light-card dark:bg-dark-card border border-light-hover dark:border-dark-hover hover:border-primary-600/30 dark:hover:border-primary-600/50 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary-600/10 group-hover:bg-primary-600/20 transition-colors">
                        <Users size={20} className="text-primary-600 dark:text-primary-400" />
                      </div>
                      <h3 className="font-semibold text-light-text dark:text-dark-text">
                        My Groups
                      </h3>
                    </div>
                    <p className="text-sm text-left text-light-text-secondary dark:text-dark-text-secondary">
                      View and manage your music groups
                    </p>
                  </Link>

                  <Link
                    to={paths.LISTENERS(null)}
                    className="group p-4 rounded-xl bg-light-card dark:bg-dark-card border border-light-hover dark:border-dark-hover hover:border-primary-600/30 dark:hover:border-primary-600/50 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary-600/10 group-hover:bg-primary-600/20 transition-colors">
                        <Music size={20} className="text-primary-600 dark:text-primary-400" />
                      </div>
                      <h3 className="font-semibold text-light-text dark:text-dark-text">
                        All Groups
                      </h3>
                    </div>
                    <p className="text-sm text-left text-light-text-secondary dark:text-dark-text-secondary">
                      Discover and join music groups
                    </p>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={paths.LOGIN}
                    className="group p-4 rounded-xl bg-light-card dark:bg-dark-card border border-light-hover dark:border-dark-hover hover:border-primary-600/30 dark:hover:border-primary-600/50 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary-600/10 group-hover:bg-primary-600/20 transition-colors">
                        <LogIn size={20} className="text-primary-600 dark:text-primary-400" />
                      </div>
                      <h3 className="font-semibold text-light-text dark:text-dark-text">Sign In</h3>
                    </div>
                    <p className="text-sm text-left text-light-text-secondary dark:text-dark-text-secondary">
                      Access your account and start syncing music
                    </p>
                  </Link>

                  <Link
                    to={paths.REGISTER}
                    className="group p-4 rounded-xl bg-light-card dark:bg-dark-card border border-light-hover dark:border-dark-hover hover:border-primary-600/30 dark:hover:border-primary-600/50 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary-600/10 group-hover:bg-primary-600/20 transition-colors">
                        <UserPlus size={20} className="text-primary-600 dark:text-primary-400" />
                      </div>
                      <h3 className="font-semibold text-light-text dark:text-dark-text">Sign Up</h3>
                    </div>
                    <p className="text-sm text-left text-light-text-secondary dark:text-dark-text-secondary">
                      Create a new account and join the community
                    </p>
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
