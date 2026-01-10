/**
 * Componente Modal reutilizable
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@shared/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  clickOutsideToClose?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = 'md',
  footer,
  clickOutsideToClose = true,
}: ModalProps) {
  // Cerrar con ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={clickOutsideToClose ? onClose : undefined}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'relative w-full',
                sizeClasses[size],
                'bg-light-card dark:bg-dark-card',
                'rounded-xl shadow-2xl',
                'border border-light-hover dark:border-dark-hover',
                'pointer-events-auto',
                'max-h-[96dvh] sm:max-h-[90dvh] overflow-hidden flex flex-col',
                className
              )}
            >
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between p-3 sm:p-4 border-b border-light-hover dark:border-dark-hover">
                  <h2 className="text-base sm:text-xl font-semibold text-light-text dark:text-dark-text">
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      'text-light-text-secondary dark:text-dark-text-secondary',
                      'hover:bg-light-hover dark:hover:bg-dark-hover',
                      'hover:text-light-text dark:hover:text-dark-text'
                    )}
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-3 sm:p-4">{children}</div>
              {footer}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
