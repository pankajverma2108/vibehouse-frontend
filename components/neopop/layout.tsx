import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: number; // 4px multiplier (e.g. gap={2} -> 8px, gap={4} -> 16px)
  padding?: number; // 4px multiplier
  paddingBlock?: number;
  paddingInline?: number;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
}

const alignMap = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const justifyMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

/**
 * HStack: Horizontal flex layout with token-backed 4px spacing
 */
export const HStack = forwardRef<HTMLDivElement, BoxProps>(function HStack(
  { gap, padding, paddingBlock, paddingInline, align = 'center', justify = 'start', wrap = false, className, style, children, ...props },
  ref
) {
  const dynamicStyle: React.CSSProperties = {
    ...(gap !== undefined ? { gap: `${gap * 4}px` } : {}),
    ...(padding !== undefined ? { padding: `${padding * 4}px` } : {}),
    ...(paddingBlock !== undefined ? { paddingBlock: `${paddingBlock * 4}px` } : {}),
    ...(paddingInline !== undefined ? { paddingInline: `${paddingInline * 4}px` } : {}),
    ...style,
  };

  return (
    <div
      ref={ref}
      style={dynamicStyle}
      className={cn('flex flex-row', alignMap[align], justifyMap[justify], wrap && 'flex-wrap', className)}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * VStack: Vertical flex layout with token-backed 4px spacing
 */
export const VStack = forwardRef<HTMLDivElement, BoxProps>(function VStack(
  { gap, padding, paddingBlock, paddingInline, align = 'stretch', justify = 'start', wrap = false, className, style, children, ...props },
  ref
) {
  const dynamicStyle: React.CSSProperties = {
    ...(gap !== undefined ? { gap: `${gap * 4}px` } : {}),
    ...(padding !== undefined ? { padding: `${padding * 4}px` } : {}),
    ...(paddingBlock !== undefined ? { paddingBlock: `${paddingBlock * 4}px` } : {}),
    ...(paddingInline !== undefined ? { paddingInline: `${paddingInline * 4}px` } : {}),
    ...style,
  };

  return (
    <div
      ref={ref}
      style={dynamicStyle}
      className={cn('flex flex-col', alignMap[align], justifyMap[justify], wrap && 'flex-wrap', className)}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Section: Semantic region with surface variants and dividers
 */
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'canvas' | 'surface' | 'raised';
  divided?: boolean;
}

const sectionVariantMap = {
  canvas: 'bg-[var(--np-black-500)] text-[var(--np-white-500)]',
  surface: 'bg-[var(--np-black-400)] text-[var(--np-white-500)]',
  raised: 'bg-[var(--np-black-300)] text-[var(--np-white-500)]',
};

export const Section = forwardRef<HTMLElement, SectionProps>(function Section(
  { variant = 'canvas', divided = false, className, children, ...props },
  ref
) {
  return (
    <section
      ref={ref}
      className={cn(
        'w-full py-12 px-4 sm:px-6 lg:px-8',
        sectionVariantMap[variant],
        divided && 'border-b border-[var(--np-black-200)]',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
});

/**
 * Grid: Responsive grid primitive for collections
 */
export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: number;
}

const colsMap = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  12: 'grid-cols-12',
};

export const Grid = forwardRef<HTMLDivElement, GridProps>(function Grid(
  { cols = 3, gap = 4, className, style, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      style={{ gap: `${gap * 4}px`, ...style }}
      className={cn('grid', colsMap[cols], className)}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Layout: Header/content/footer frame for a bounded surface
 */
export const Layout = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Layout(
  { className, children, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn('flex flex-col min-h-screen bg-[var(--np-black-500)] text-[var(--np-white-500)]', className)} {...props}>
      {children}
    </div>
  );
});

/**
 * LayoutContent: Scrollable content region
 */
export const LayoutContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function LayoutContent(
  { className, children, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn('flex-1 overflow-y-auto', className)} {...props}>
      {children}
    </div>
  );
});

/**
 * LayoutFooter: Footer region with optional divider
 */
export interface LayoutFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  divided?: boolean;
}

export const LayoutFooter = forwardRef<HTMLDivElement, LayoutFooterProps>(function LayoutFooter(
  { divided = true, className, children, ...props },
  ref
) {
  return (
    <footer
      ref={ref}
      className={cn('w-full py-6 px-4 sm:px-6 bg-[var(--np-black-400)]', divided && 'border-t border-[var(--np-black-200)]', className)}
      {...props}
    >
      {children}
    </footer>
  );
});

/**
 * AppShell: Product frame with optional TopNav, SideNav, and main content
 */
export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  topNav?: React.ReactNode;
  sideNav?: React.ReactNode;
}

export const AppShell = forwardRef<HTMLDivElement, AppShellProps>(function AppShell(
  { topNav, sideNav, className, children, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn('flex flex-col min-h-screen bg-[var(--np-black-500)] text-[var(--np-white-500)]', className)} {...props}>
      {topNav}
      <div className="flex flex-1 overflow-hidden">
        {sideNav}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
});
