import { cn } from '@shared/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  ...props
}: SkeletonProps & React.HTMLAttributes<HTMLDivElement>) {
  const baseStyles = cn(
    'relative overflow-hidden',
    // Colores base con mejor contraste para dark mode
    'bg-light-hover dark:bg-dark-hover',
    'transition-colors duration-200',
    // Animación shimmer mejorada - más visible en dark mode
    'after:absolute after:inset-0',
    'after:animate-shimmer',
    'after:bg-gradient-to-r',
    'after:from-transparent',
    'after:via-white/20 dark:after:via-white/10',
    'after:to-transparent',
    'after:pointer-events-none',
    // Pulse animation suave como base
    'animate-pulse'
  );

  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className={cn(baseStyles, variantStyles[variant], className)} style={style} {...props} />
  );
}
