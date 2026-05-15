"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BookOpen, ConciergeBell, Home, ShoppingBag } from "lucide-react";

import { useGuestExperience } from "@/state/guest-experience-provider";
import { cn } from "@/lib/utils";

type GuestNavBadge = "cart";

type GuestNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: GuestNavBadge;
  exact?: boolean;
};

const navItems: GuestNavItem[] = [
  { label: "Home", href: "", icon: Home, exact: true },
  { label: "Services", href: "services", icon: ConciergeBell },
  { label: "Add-Ons", href: "addons", icon: ShoppingBag, badge: "cart" },
  { label: "Guide", href: "guide", icon: BookOpen },
];

function isActivePath(pathname: string, href: string, exact = false): boolean {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GuestNav() {
  const pathname = usePathname();
  const { badgeCounts, getGuestRouteHref } = useGuestExperience();

  return (
    <>
      <nav className="sticky top-0 z-40 -mx-4 border-b border-white/10 bg-[#07070a]/92 px-4 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.28)] backdrop-blur-xl md:top-3 md:mx-0 md:rounded-[8px] md:border md:border-white/12 md:bg-[#07070a]/92 md:p-2" aria-label="Guest navigation">
        <div className="grid grid-cols-4 gap-1.5 md:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const href = getGuestRouteHref(item.href);
            const active = isActivePath(pathname, href, Boolean(item.exact));
            const count = item.badge ? badgeCounts[item.badge] : 0;

            return (
              <Link
                key={item.label}
                className={cn(
                  "group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[8px] border border-transparent px-2 py-2 text-center text-[10px] font-black uppercase text-[#cbd5e1] transition duration-300 md:min-h-16 md:text-[11px]",
                  active
                    ? "text-white hover:bg-transparent"
                    : "hover:border-white/20 hover:bg-white/8 hover:text-white",
                )}
                href={href}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {active ? <span className="absolute inset-x-5 bottom-1.5 h-0.5 rounded-full bg-[var(--vh-pink)]" /> : null}
                {count > 0 ? (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-[#f9cb37] px-1.5 py-0.5 text-[9px] leading-none text-[#111111] md:right-2 md:top-2 md:text-[10px]">
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
