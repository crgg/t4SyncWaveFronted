import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CircleQuestionMark, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

import { Button } from '@shared/components/Button/Button';
import { Modal } from '@shared/components/Modal/Modal';
import { cn } from '@/shared/utils';

interface AlertDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  onConfirmation: () => void;
  onRejection: () => void;
  hasAutoConfirmation?: boolean;
  variant?: TDialogVariant;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

const MAX_SECONDS = 7;

interface Variant {
  Icon: React.ElementType;
  iconWave: string;
  iconBackground: string;
}

const variants: Record<TDialogVariant, Variant> = {
  red: {
    Icon: AlertTriangle,
    iconWave: 'bg-red-500/20',
    iconBackground: 'from-red-600 via-red-500 to-red-400 ring-red-500/20',
  },
  emerald: {
    Icon: CircleQuestionMark,
    iconWave: 'bg-emerald-500/20',
    iconBackground: 'from-emerald-600 via-emerald-500 to-emerald-400 ring-emerald-500/20',
  },
};

function AlertDialogChild({
  open,
  message = 'Are you sure you want to confirm this action?',
  title = 'Alert',
  onConfirmation,
  onRejection,
  hasAutoConfirmation = true,
  variant = 'red',
  confirmButtonText = 'Confirm Now',
  cancelButtonText = 'Cancel',
}: AlertDialogProps) {
  const [seconds, setSeconds] = useState(MAX_SECONDS);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasAutoConfirmedRef = useRef(false);

  const onConfirmationRef = useRef(onConfirmation);
  const onRejectionRef = useRef(onRejection);

  const selectedVariant = variants[variant];

  useEffect(() => {
    onConfirmationRef.current = onConfirmation;
    onRejectionRef.current = onRejection;
  }, [onConfirmation, onRejection]);

  useEffect(() => {
    if (!open) {
      setSeconds(MAX_SECONDS);
      setProgress(100);
      startTimeRef.current = null;
      hasAutoConfirmedRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    startTimeRef.current = Date.now();
    const duration = MAX_SECONDS * 1000;

    const updateProgress = () => {
      if (!startTimeRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);
      const remainingSeconds = Math.ceil(remaining / 1000);
      const progressPercent = (remaining / duration) * 100;

      setSeconds(remainingSeconds);
      setProgress(Math.max(0, progressPercent));

      if (remaining > 0) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        if (!hasAutoConfirmedRef.current) {
          hasAutoConfirmedRef.current = true;
          onConfirmationRef.current();
        }
      }
    };

    if (hasAutoConfirmation) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [open, hasAutoConfirmation]);

  const handleConfirmation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    onConfirmationRef.current();
  };

  const handleRejection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    onRejectionRef.current();
  };

  const handleClose = () => {
    handleRejection();
  };

  return (
    <Modal
      footer={hasAutoConfirmation && <AlertDialogFooter progress={progress} seconds={seconds} />}
      clickOutsideToClose={false}
      onClose={handleClose}
      isOpen={open}
      size="md"
    >
      <div className="space-y-6">
        {/* Icon with pulse animation */}
        <motion.div
          className="flex justify-center mb-4 mt-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className="relative">
            <motion.div
              className={cn('absolute inset-0 rounded-full', selectedVariant.iconWave)}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <div
              className={cn(
                'relative w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center shadow-xl ring-4 ',
                selectedVariant.iconBackground
              )}
            >
              <selectedVariant.Icon size={36} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
        </motion.div>

        {/* Title and message with fade-in */}
        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-xl font-bold text-light-text dark:text-dark-text">{title}</h3>
          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 px-2">{message}</p>
        </motion.div>

        {/* Timer display */}
        {hasAutoConfirmation && (
          <motion.div
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Clock size={16} className="text-red-600 dark:text-red-400" />
            <span className="text-sm font-semibold text-red-700 dark:text-red-300">
              Auto-confirming in <span className="text-lg font-bold tabular-nums">{seconds}</span>{' '}
              {seconds === 1 ? 'second' : 'seconds'}
            </span>
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          className="flex gap-3 pt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleRejection}
            className="flex-1 min-w-0 font-medium"
          >
            {cancelButtonText}
          </Button>
          <Button
            type="button"
            variant={variant === 'emerald' ? 'emerald' : 'danger'}
            onClick={handleConfirmation}
            className="flex-1 min-w-0 font-medium shadow-md hover:shadow-lg transition-shadow"
          >
            {confirmButtonText}
          </Button>
        </motion.div>
      </div>
    </Modal>
  );
}

function AlertDialogFooter({ progress, seconds }: { progress: number; seconds: number }) {
  const isUrgent = seconds <= 2;

  return (
    <div className="relative h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
      <motion.div
        className={`h-full ${
          isUrgent
            ? 'bg-gradient-to-r from-red-600 to-red-500'
            : 'bg-gradient-to-r from-primary-600 to-primary-500'
        }`}
        initial={{ width: '100%' }}
        animate={{ width: `${progress}%` }}
        transition={{
          duration: 0.1,
          ease: 'linear',
        }}
        style={{
          boxShadow: isUrgent
            ? '0 0 10px rgba(239, 68, 68, 0.5)'
            : '0 0 8px rgba(197, 160, 89, 0.3)',
        }}
      />
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ width: '50%' }}
      />
    </div>
  );
}

const AlertDialog = (props: AlertDialogProps) => {
  if (!props.open) return null;
  return <AlertDialogChild {...props} />;
};

export default AlertDialog;
