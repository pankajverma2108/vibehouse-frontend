import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type ElevationType = 'none' | 'low' | 'high' | 'yellow' | 'green' | 'pink' | 'black';

export interface ElevatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'raised' | 'canvas';
  elevation?: ElevationType;
  hoverable?: boolean;
}

const cardElevations: Record<ElevationType, string> = {
  none: '',
  low: 'shadow-[3px_3px_0px_var(--np-black-200)]',
  high: 'shadow-[6px_6px_0px_var(--np-black-200)]',
  yellow: 'shadow-[4px_4px_0px_var(--np-yellow)]',
  green: 'shadow-[4px_4px_0px_var(--np-green)]',
  pink: 'shadow-[4px_4px_0px_var(--np-pink)]',
  black: 'shadow-[4px_4px_0px_#000000]',
};

const cardVariants = {
  canvas: 'bg-[var(--np-black-500)] text-[var(--np-white-500)]',
  surface: 'bg-[var(--np-black-400)] text-[var(--np-white-500)]',
  raised: 'bg-[var(--np-black-300)] text-[var(--np-white-500)]',
};

export const ElevatedCard = forwardRef<HTMLDivElement, ElevatedCardProps>(function ElevatedCard(
  { variant = 'raised', elevation = 'low', hoverable = false, className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'p-5 border border-[var(--np-black-200)] rounded-none transition-all',
        cardVariants[variant],
        cardElevations[elevation],
        hoverable && 'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_var(--np-black-200)] cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export interface SelectableCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  elevation?: ElevationType;
  accentColor?: 'yellow' | 'green' | 'pink';
}

export const SelectableCard = forwardRef<HTMLButtonElement, SelectableCardProps>(function SelectableCard(
  { selected = false, elevation = 'low', accentColor = 'yellow', className, children, disabled, ...props },
  ref
) {
  const accentBorder = accentColor === 'yellow' ? 'border-[var(--np-yellow)]' : accentColor === 'green' ? 'border-[var(--np-green)]' : 'border-[var(--np-pink)]';
  const accentShadow = accentColor === 'yellow' ? 'shadow-[4px_4px_0px_var(--np-yellow)]' : accentColor === 'green' ? 'shadow-[4px_4px_0px_var(--np-green)]' : 'shadow-[4px_4px_0px_var(--np-pink)]';

  return (
    <button
      ref={ref}
      type="button"
      role="button"
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        'w-full text-left p-4.5 border-2 rounded-none transition-all select-none font-["Gilroy",sans-serif]',
        selected
          ? cn('bg-[var(--np-black-300)]', accentBorder, accentShadow)
          : cn('bg-[var(--np-black-400)] border-[var(--np-black-200)] text-[var(--np-white-500)] hover:border-[var(--np-white-100)]/40', cardElevations[elevation]),
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
