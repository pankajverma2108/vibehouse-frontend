import React, { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'success' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'default' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  edgeColor?: string;
  fullWidth?: boolean;
  asChild?: boolean;
}

const variantFaceStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--vh-pink)] text-white border border-[var(--vh-pink)] hover:bg-[var(--vh-pink-soft)] font-bold transition-colors',
  secondary: 'bg-[var(--np-black-300)] text-[var(--np-white-500)] border border-[var(--np-black-200)] hover:border-white/40 font-semibold transition-colors',
  destructive: 'bg-[var(--np-red)] text-white border border-[var(--np-red)] font-bold',
  success: 'bg-[var(--np-green)] text-[var(--np-black-500)] border border-[var(--np-green)] font-bold',
  ghost: 'bg-transparent text-[var(--np-white-500)] hover:bg-[var(--np-black-400)] font-medium',
  outline: 'bg-[var(--np-black-400)] text-[var(--np-white-500)] border-2 border-[var(--np-black-200)] hover:border-[var(--np-white-500)] font-semibold',
};

const variantEdgeColors: Record<ButtonVariant, string> = {
  primary: '#991438',
  secondary: '#2a2a38',
  destructive: '#7a1d12',
  success: '#0d4a30',
  ghost: 'transparent',
  outline: '#2a2a38',
};

const sizeStyles: Record<ButtonSize, { container: string; face: string; iconSize: string }> = {
  sm: {
    container: 'h-8 text-xs',
    face: 'px-3 text-xs tracking-[0.055em]',
    iconSize: 'w-3.5 h-3.5',
  },
  default: {
    container: 'h-11 text-sm',
    face: 'px-5 text-[0.82rem] tracking-[0.055em]',
    iconSize: 'w-4 h-4',
  },
  lg: {
    container: 'h-13 text-base',
    face: 'px-7 text-sm tracking-[0.06em]',
    iconSize: 'w-5 h-5',
  },
};

/**
 * NeoPOP Button with 3D Plunk Bevel Edge and 120ms Physical Press Response
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'default',
    label,
    loading = false,
    disabled = false,
    startIcon,
    endIcon,
    edgeColor,
    fullWidth = false,
    asChild = false,
    className,
    style,
    children,
    ...props
  },
  ref
) {
  const resolvedEdge = edgeColor || variantEdgeColors[variant];
  const sizeConfig = sizeStyles[size];

  const content = (
    <>
      {loading ? (
        <Loader2 className={cn('animate-spin mr-2', sizeConfig.iconSize)} />
      ) : startIcon ? (
        <span className={cn('mr-2 inline-flex items-center', sizeConfig.iconSize)}>{startIcon}</span>
      ) : null}
      <span className="truncate">{label || children}</span>
      {!loading && endIcon ? (
        <span className={cn('ml-2 inline-flex items-center', sizeConfig.iconSize)}>{endIcon}</span>
      ) : null}
    </>
  );

  const containerClasses = cn(
    'np-plunk select-none cursor-pointer uppercase font-["Gilroy",sans-serif]',
    sizeConfig.container,
    fullWidth ? 'w-full flex' : 'inline-flex',
    disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
    className
  );

  const faceClasses = cn(
    'np-plunk-face flex items-center justify-center font-bold',
    sizeConfig.face,
    variantFaceStyles[variant]
  );

  const plunkStyle = {
    '--np-edge': resolvedEdge,
    ...style,
  } as React.CSSProperties;

  if (asChild) {
    return (
      <Slot
        ref={ref}
        style={plunkStyle}
        className={containerClasses}
        {...(props as any)}
      >
        <span className={faceClasses}>{content}</span>
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      style={plunkStyle}
      className={containerClasses}
      {...props}
    >
      <span className={faceClasses}>{content}</span>
    </button>
  );
});

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  'aria-label': string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  edgeColor?: string;
  loading?: boolean;
}

const iconSizeStyles: Record<ButtonSize, { container: string; face: string; iconSize: string }> = {
  sm: { container: 'w-8 h-8', face: 'w-8 h-8', iconSize: 'w-3.5 h-3.5' },
  default: { container: 'w-11 h-11', face: 'w-11 h-11', iconSize: 'w-4 h-4' },
  lg: { container: 'w-13 h-13', face: 'w-13 h-13', iconSize: 'w-5 h-5' },
};

/**
 * NeoPOP IconButton: Accessible icon-only button with 3D plunk press
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    'aria-label': ariaLabel,
    variant = 'secondary',
    size = 'default',
    edgeColor,
    loading = false,
    disabled = false,
    className,
    style,
    ...props
  },
  ref
) {
  const resolvedEdge = edgeColor || variantEdgeColors[variant];
  const sizeConfig = iconSizeStyles[size];

  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      disabled={disabled || loading}
      style={{ '--np-edge': resolvedEdge, ...style } as React.CSSProperties}
      className={cn(
        'np-plunk select-none cursor-pointer',
        sizeConfig.container,
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      <span className={cn('np-plunk-face flex items-center justify-center', sizeConfig.face, variantFaceStyles[variant])}>
        {loading ? <Loader2 className={cn('animate-spin', sizeConfig.iconSize)} /> : icon}
      </span>
    </button>
  );
});
