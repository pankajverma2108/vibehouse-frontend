"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarPlus, ConciergeBell, Home, PackagePlus, Search, ShoppingBag } from "lucide-react";

import { useGuestExperience } from "@/state/guest-experience-provider";
import { cn } from "@/lib/utils";

type GuestNavBadge = "cart" | "borrow";

type GuestNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: GuestNavBadge;
};

const navItems: GuestNavItem[] = [
  { label: "Dashboard", href: "", icon: Home },
  { label: "Services", href: "services", icon: ConciergeBell },
  { label: "Add-ons", href: "addons", icon: ShoppingBag, badge: "cart" },
  { label: "Borrow", href: "borrow", icon: PackagePlus, badge: "borrow" },
  { label: "Extend", href: "extend", icon: CalendarPlus },
  { label: "Guide", href: "guide", icon: BookOpen },
  { label: "Lost & Found", href: "lost-found", icon: Search },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/guest") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GuestNav() {
  const pathname = usePathname();
  const { badgeCounts, getGuestRouteHref } = useGuestExperience();

  return (
    <>
      <nav className="hidden rounded-[12px] border border-[#334155] bg-[#10131a]/90 p-2 shadow-[0_18px_42px_rgba(0,0,0,0.28)] md:block" aria-label="Guest navigation">
        <div className="grid grid-cols-7 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const href = getGuestRouteHref(item.href);
            const active = isActivePath(pathname, href);
            const count = item.badge ? badgeCounts[item.badge] : 0;

            return (
              <Link
                key={item.label}
                className={cn(
                  "group relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-[8px] border border-transparent px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.08em] text-[#94a3b8] transition duration-300 hover:border-[var(--vh-pink)]/45 hover:bg-[var(--vh-pink)]/10 hover:text-white",
                  active && "border-[var(--vh-pink)] bg-[var(--vh-pink)] text-white shadow-[0_12px_28px_rgba(198,40,40,0.28)]",
                )}
                href={href}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {count > 0 ? (
                  <span className="absolute right-2 top-2 rounded-full bg-[#facc15] px-1.5 py-0.5 text-[10px] leading-none text-[#111111]">
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--vh-pink)]/25 bg-[#07070a]/96 px-3 pb-3 pt-2 shadow-[0_-18px_42px_rgba(0,0,0,0.42)] backdrop-blur md:hidden"
        aria-label="Guest mobile navigation"
      >
        <div className="flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const href = getGuestRouteHref(item.href);
            const active = isActivePath(pathname, href);
            const count = item.badge ? badgeCounts[item.badge] : 0;

            return (
              <Link
                key={item.label}
                className={cn(
                  "relative flex min-w-[74px] flex-col items-center justify-center gap-1 rounded-[8px] border border-[#334155] bg-[#1e293b] px-2 py-2 text-[10px] font-black uppercase tracking-[0.06em] text-[#94a3b8] transition duration-300",
                  active && "border-[var(--vh-pink)] bg-[var(--vh-pink)] text-white",
                )}
                href={href}
              >
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{item.label}</span>
                {count > 0 ? (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-[#facc15] px-1.5 py-0.5 text-[9px] leading-none text-[#111111]">
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
