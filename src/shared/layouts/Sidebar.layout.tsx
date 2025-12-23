import { HomeIcon, LogOutIcon, PanelRightOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { getInitials } from '../utils';
import { layoutActions } from '@/app/slices/layoutSlice';
import { STORAGE_KEYS } from '../constants';
import { Link, useNavigate } from 'react-router-dom';

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
  ];

  return (
    <>
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isSidebarOpen ? 0 : '-100%' }}
        transition={{ duration: 0.3 }}
        className="max-w-[270px] w-full px-4 pb-3 gap-4 fixed left-0 z-[52] max-h-screen h-full bg-white dark:bg-zinc-900 border-r border-zinc-700 dark:border-zinc-700 grid grid-rows-[auto_1fr_auto]"
      >
        <div>
          <div className="flex items-center justify-between py-2">
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              T4SyncWave
            </h1>
            <button
              className="active:scale-95 transition-all duration-300"
              onClick={onCloseSidebar}
            >
              <PanelRightOpen size={18} />
            </button>
          </div>
          <div className="py-2 flex gap-2">
            <div className="rounded-full dark:bg-[#B0FFEF] bg-[#5bfada] font-bold w-8 h-8 flex items-center justify-center text-zinc-800 text-xs">
              {getInitials(user?.name)}
            </div>
            <div>
              <p className="font-bold text-xs text-ellipsis overflow-hidden whitespace-nowrap max-w-[230px]">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 text-ellipsis overflow-hidden whitespace-nowrap max-w-[230px]">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <div className="flex flex-col gap-2 h-full">
            {menuItems.map((item, index) => (
              <motion.div
                transition={{ duration: 0.3, delay: index * 0.4 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                key={item.label}
              >
                <Link to={item.href} onClick={onCloseSidebar}>
                  <div key={item.label} className="flex items-center gap-2 py-1">
                    {item.icon}
                    <span className="text-xs">{item.label}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
        <div className="flex flex-col gap-2 h-full">
          <button className="flex items-center gap-2 py-3" onClick={handleLogout}>
            <LogOutIcon size={18} />
            <span className="text-xs">Logout</span>
          </button>
          <div className="text-[10px] text-gray-500 text-center">Version V1.0.1</div>
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
