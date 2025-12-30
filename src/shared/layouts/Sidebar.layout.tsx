import { HomeIcon, LogOutIcon, PanelRightOpen, UserIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { getInitials } from '../utils';
import { layoutActions } from '@/app/slices/layoutSlice';
import { STORAGE_KEYS } from '../constants';
import { Link, useNavigate } from 'react-router-dom';
import { paths } from '@/routes/paths';

const SidebarLayout = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isSidebarOpen = useAppSelector((state) => state.layout.isSidebarOpen);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const onCloseSidebar = () => {
    dispatch(layoutActions.setSidebarOpen(false));
  };

  const handleLogout = () => {
    onCloseSidebar();
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    navigate('/login');
  };

  const menuItems = [
    {
      label: 'Home',
      icon: <HomeIcon size={18} />,
      href: '/',
    },
    {
      label: 'Profile',
      icon: <UserIcon size={18} />,
      href: paths.PROFILE,
    },
  ];

  return (
    <>
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isSidebarOpen ? 0 : '-100%' }}
        transition={{ duration: 0.3 }}
        className="max-w-[280px] w-full px-4 pb-4 gap-4 fixed left-0 z-[52] max-h-screen h-full bg-light-bg/95 dark:bg-dark-bg/95 backdrop-blur-sm border-r border-light-hover/30 dark:border-dark-hover/30 grid grid-rows-[auto_1fr_auto]"
      >
        <div>
          <div className="flex items-center justify-between py-4 border-b border-light-hover/50 dark:border-dark-hover/50">
            <h1 className="text-lg font-semibold text-primary dark:text-primary-light">
              T4SyncWave
            </h1>
            <button
              className="p-1.5 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition-colors text-light-text-secondary dark:text-dark-text-secondary"
              onClick={onCloseSidebar}
            >
              <PanelRightOpen size={18} />
            </button>
          </div>
          <Link to={paths.PROFILE} onClick={onCloseSidebar}>
            <div className="py-2 flex gap-2 cursor-pointer hover:bg-light-hover dark:hover:bg-dark-hover rounded-lg px-2 -mx-2 transition-colors">
              <div className="rounded-full dark:bg-primary-light bg-primary font-bold w-8 h-8 flex items-center justify-center text-secondary text-xs overflow-hidden flex-shrink-0">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-primary dark:text-primary-light font-medium text-xs">
                    {getInitials(user?.name)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 max-w-[230px] overflow-hidden">
                <p className="font-bold text-xs text-ellipsis overflow-hidden whitespace-nowrap max-w-[230px] line-clamp-1 truncate pr-3">
                  {user?.name}
                </p>
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary text-ellipsis overflow-hidden whitespace-nowrap">
                  {user?.email}
                </p>
              </div>
            </div>
          </Link>
        </div>
        <AnimatePresence mode="wait">
          <div className="flex flex-col gap-1 py-2">
            {menuItems.map((item, index) => (
              <motion.div
                transition={{ duration: 0.2, delay: index * 0.1 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                key={item.label}
              >
                <Link to={item.href} onClick={onCloseSidebar}>
                  <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-light-hover/50 dark:hover:bg-dark-hover/50 transition-colors text-light-text-secondary dark:text-dark-text-secondary hover:text-primary dark:hover:text-primary-light">
                    {item.icon}
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
        <div className="flex flex-col gap-1 pt-2 border-t border-light-hover/50 dark:border-dark-hover/50">
          <button
            className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-light-hover/50 dark:hover:bg-dark-hover/50 transition-colors text-light-text-secondary dark:text-dark-text-secondary hover:text-red-600 dark:hover:text-red-400"
            onClick={handleLogout}
          >
            <LogOutIcon size={18} />
            <span className="text-sm font-medium">Logout</span>
          </button>
          <div className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary text-center mt-2">
            Version V1.0.0
          </div>
        </div>
      </motion.aside>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isSidebarOpen ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[51] bg-black/50"
            onClick={() => {
              dispatch(layoutActions.setSidebarOpen(false));
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default SidebarLayout;
