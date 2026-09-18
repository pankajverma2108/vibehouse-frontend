import React, { forwardRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface TopNavProps extends React.HTMLAttributes<HTMLElement> {
  sticky?: boolean;
}

export const TopNav = forwardRef<HTMLElement, TopNavProps>(function TopNav(
  { sticky = true, className, children, ...props },
  ref
) {
  return (
    <header
      ref={ref}
      className={cn(
        'w-full h-16 bg-[var(--np-black-500)] border-b border-[var(--np-black-200)] flex items-center justify-between px-4 sm:px-6 lg:px-8 z-40',
        sticky && 'sticky top-0',
        className
      )}
      {...props}
    >
      {children}
    </header>
  );
});

export interface SideNavProps extends React.HTMLAttributes<HTMLElement> {
  width?: string;
}

export const SideNav = forwardRef<HTMLElement, SideNavProps>(function SideNav(
  { width = 'w-64', className, children, ...props },
  ref
) {
  return (
    <aside
      ref={ref}
      className={cn(
        'h-full bg-[var(--np-black-400)] border-r border-[var(--np-black-200)] flex flex-col p-4 overflow-y-auto font-["Gilroy",sans-serif]',
        width,
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
});

export function SideNavSection({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1 mb-6 last:mb-0', className)} {...props}>
      {children}
    </div>
  );
}

export function SideNavHeading({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-[var(--np-white-100)]/60 px-3 py-1.5 mb-1',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export interface SideNavItemProps extends React.HTMLAttributes<HTMLElement> {
  href: string;
  active?: boolean;
  icon?: React.ReactNode;
}

export const SideNavItem = forwardRef<HTMLAnchorElement, SideNavItemProps>(function SideNavItem(
  { href, active = false, icon, className, children, ...props },
  ref
) {
  return (
    <Link
      ref={ref}
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors rounded-none',
        active
          ? 'bg-[var(--np-black-300)] text-[var(--np-yellow)] border-l-3 border-[var(--np-yellow)]'
          : 'text-[var(--np-white-300)] hover:text-white hover:bg-[var(--np-black-300)]/60',
        className
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4 shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </Link>
  );
});
