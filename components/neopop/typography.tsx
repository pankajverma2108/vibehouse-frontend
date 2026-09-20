import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  variant?: 'editorial-display' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
  color?: 'white' | 'soft-white' | 'yellow' | 'green' | 'pink' | 'muted' | 'black';
}

const headingVariants = {
  'editorial-display': 'font-["Cirka",serif] text-[clamp(2.8rem,8vw,5.5rem)] font-bold tracking-tight leading-[1.02] text-balance',
  h1: 'font-["Cirka",serif] text-[clamp(2.1rem,5vw,3.8rem)] font-bold tracking-tight leading-[1.05] text-balance',
  h2: 'font-["Cirka",serif] text-[clamp(1.55rem,3vw,2.35rem)] font-bold tracking-tight leading-[1.12]',
  h3: 'font-["Cirka",serif] text-[clamp(1.2rem,2vw,1.6rem)] font-semibold leading-[1.2]',
  h4: 'font-body text-[1.15rem] font-bold uppercase tracking-[0.055em] leading-[1.25]',
  h5: 'font-body text-[0.95rem] font-bold uppercase tracking-[0.08em] leading-[1.3]',
};

const headingColors = {
  white: 'text-[var(--np-white-500)]',
  'soft-white': 'text-[var(--np-white-300)]',
  yellow: 'text-[var(--np-yellow)]',
  green: 'text-[var(--np-green)]',
  pink: 'text-[var(--np-pink)]',
  muted: 'text-[var(--np-white-100)]',
  black: 'text-[var(--np-black-500)]',
};

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { level = 2, variant, color = 'white', className, children, ...props },
  ref
) {
  const Component = `h${level}` as const;
  const resolvedVariant = variant || (level === 1 ? 'h1' : level === 2 ? 'h2' : level === 3 ? 'h3' : level === 4 ? 'h4' : 'h5');

  return (
    <Component
      ref={ref as any}
      className={cn(headingVariants[resolvedVariant], headingColors[color], className)}
      {...props}
    >
      {children}
    </Component>
  );
});

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  variant?: 'body' | 'subtitle' | 'caption' | 'utility' | 'control';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  color?: 'primary' | 'secondary' | 'muted' | 'yellow' | 'green' | 'red' | 'blue' | 'pink' | 'black';
  maxLines?: number;
}

const textVariants = {
  body: 'font-body',
  subtitle: 'font-body text-base leading-relaxed',
  caption: 'font-body text-xs leading-normal',
  utility: 'font-body text-[0.69rem] font-extrabold uppercase tracking-[0.12em]',
  control: 'font-body text-[0.82rem] font-bold uppercase tracking-[0.055em]',
};

const textSizes = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const textWeights = {
  light: 'font-light',
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
};

const textColors = {
  primary: 'text-[var(--np-white-500)]',
  secondary: 'text-[var(--np-white-secondary)]',
  muted: 'text-[var(--np-white-100)]',
  yellow: 'text-[var(--np-yellow)]',
  green: 'text-[var(--np-green)]',
  red: 'text-[var(--np-red)]',
  blue: 'text-[var(--np-blue)]',
  pink: 'text-[var(--np-pink)]',
  black: 'text-[var(--np-black-500)]',
};

export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  {
    as: Component = 'p',
    variant = 'body',
    size,
    weight,
    color = 'primary',
    maxLines,
    className,
    style,
    children,
    ...props
  },
  ref
) {
  const lineClampStyle: React.CSSProperties = maxLines
    ? {
        display: '-webkit-box',
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        ...style,
      }
    : { ...style };

  return (
    <Component
      ref={ref as any}
      style={lineClampStyle}
      className={cn(
        textVariants[variant],
        size && textSizes[size],
        weight && textWeights[weight],
        textColors[color],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});
