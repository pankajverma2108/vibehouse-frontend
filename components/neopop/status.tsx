import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type TokenVariant = 'yellow' | 'green' | 'blue' | 'pink' | 'red' | 'neutral';

export interface TokenProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TokenVariant;
  label?: string;
}

const tokenVariantStyles: Record<TokenVariant, string> = {
  yellow: 'bg-[var(--np-yellow)] text-black border border-[var(--np-yellow)]',
  green: 'bg-[var(--np-green)] text-black border border-[var(--np-green)]',
  blue: 'bg-[var(--np-blue)] text-white border border-[var(--np-blue)]',
  pink: 'bg-[var(--np-pink)] text-white border border-[var(--np-pink)]',
  red: 'bg-[var(--np-red)] text-white border border-[var(--np-red)]',
  neutral: 'bg-[var(--np-black-300)] text-[var(--np-white-300)] border border-[var(--np-black-200)]',
};

/**
 * NeoPOP Token: Sharp rectangular semantic workflow chip
 */
export const Token = forwardRef<HTMLSpanElement, TokenProps>(function Token(
  { variant = 'neutral', label, className, children, ...props },
  ref
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center px-2 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] rounded-none font-["Gilroy",sans-serif]',
        tokenVariantStyles[variant],
        className
      )}
      {...props}
    >
      {label || children}
    </span>
  );
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count?: number | string;
  variant?: 'primary' | 'secondary' | 'accent' | 'destructive';
}

const badgeVariantStyles = {
  primary: 'bg-[var(--np-yellow)] text-black',
  secondary: 'bg-[var(--np-black-300)] text-white border border-[var(--np-black-200)]',
  accent: 'bg-[var(--np-green)] text-black',
  destructive: 'bg-[var(--np-red)] text-white',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { count, variant = 'primary', className, children, ...props },
  ref
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-none',
        badgeVariantStyles[variant],
        className
      )}
      {...props}
    >
      {count !== undefined ? count : children}
    </span>
  );
});

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: 'live' | 'connecting' | 'offline' | 'error';
  pulse?: boolean;
  'aria-label': string;
}

const statusColors = {
  live: 'bg-[var(--np-green)]',
  connecting: 'bg-[var(--np-yellow)]',
  offline: 'bg-[var(--np-black-200)]',
  error: 'bg-[var(--np-red)]',
};

export const StatusDot = forwardRef<HTMLSpanElement, StatusDotProps>(function StatusDot(
  { status = 'offline', pulse = true, 'aria-label': ariaLabel, className, ...props },
  ref
) {
  return (
    <span
      ref={ref}
      role="status"
      aria-label={ariaLabel}
      className={cn('relative inline-flex items-center justify-center w-2.5 h-2.5', className)}
      {...props}
    >
      {pulse && (status === 'live' || status === 'connecting') && (
        <span
          className={cn(
            'absolute inline-flex w-full h-full opacity-75 animate-ping',
            statusColors[status]
          )}
        />
      )}
      <span className={cn('relative inline-flex w-2 h-2', statusColors[status])} />
    </span>
  );
});

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt: string;
  fallback?: string;
  size?: 'sm' | 'default' | 'lg';
}

const avatarSizes = {
  sm: 'w-7 h-7 text-xs',
  default: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(function Avatar(
  { src, alt, fallback, size = 'default', className, ...props },
  ref
) {
  const initials = fallback || alt.slice(0, 2).toUpperCase();

  return (
    <div
      ref={ref}
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden border-2 border-[var(--np-black-200)] bg-[var(--np-black-300)] text-[var(--np-white-300)] font-bold rounded-none select-none',
        avatarSizes[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
});

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn('animate-pulse bg-[var(--np-black-300)] border border-[var(--np-black-200)]/40 rounded-none', className)}
      {...props}
    />
  );
});
