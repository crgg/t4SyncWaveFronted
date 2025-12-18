import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <header className="sticky top-0 z-50 bg-light-card dark:bg-dark-card border-b border-light-hover dark:border-dark-hover shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent"
          >
            T4SyncWave
          </Link>

          <div className="flex items-center gap-4">
            {!isAuthPage && (
              <>
                <Link
                  to="/upload"
                  className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors"
                >
                  Upload Music
                </Link>
                {location.pathname !== '/login' && location.pathname !== '/register' && (
                  <Link
                    to="/login"
                    className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors"
                  >
                    Login
                  </Link>
                )}
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
