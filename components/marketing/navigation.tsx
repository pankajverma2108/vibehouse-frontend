"use client";

import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowRight, CircleUserRound, Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { hostelNavItems } from "@/content/nav-menu";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";
import { isStandalonePublicRoute } from "@/lib/feedback-route";
import { cn } from "@/lib/utils";
import { VibehouseLogo } from "./vibehouse-logo";
import { MagneticButton } from "./interactive/magnetic-button";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Sanctuary", href: "/property" },
  { label: "Lineup", href: "/events" },
  { label: "Colive", href: "/colive" },
  { label: "Upcoming", href: "/upcoming" },
  { label: "Partner", href: "/partner-with-us" },
];

function isGuestHubRoute(pathname: string): boolean {
  return pathname === "/guest" || pathname.startsWith("/guest/") || /^\/[^/]+\/guest(?:\/|$)/.test(pathname);
}

export function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion() ?? false;
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { guest, isAuthenticated, isRestoringSession, openAuthModal, signOut } = useGuestAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const shouldShowSignedInState = isAuthenticated || isRestoringSession;
  const guestFirstName = useMemo(() => {
    const firstToken = guest?.name?.trim().split(/\s+/)[0];
    return firstToken || "Guest";
  }, [guest]);

  const propertyHref = useMemo(
    () =>
      getDefaultPropertyDestinationHref(
        hostelNavItems[0]?.id,
        "/property",
        searchParams.get("checkin"),
        searchParams.get("checkout"),
      ),
    [searchParams],
  );

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const onWindowClick = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onWindowClick);
    return () => window.removeEventListener("mousedown", onWindowClick);
  }, [isProfileMenuOpen]);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  if (isGuestHubRoute(pathname) || isStandalonePublicRoute(pathname)) {
    return null;
  }

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300 pointer-events-none px-4 sm:px-6 md:px-8",
          isScrolled ? "pt-3 sm:pt-4" : "pt-4 sm:pt-6"
        )}
      >
        <div className="max-w-[1280px] mx-auto flex items-center justify-between pointer-events-auto">
          {/* Main Floating Glass Dock */}
          <div
            className={cn(
              "w-full flex items-center justify-between gap-4 sm:gap-6 px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300 rounded-full",
              isScrolled
                ? "bg-black/85 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
                : "bg-black/60 backdrop-blur-md border border-white/10"
            )}
          >
            {/* Authentic Vibehouse Brand */}
            <div className="flex items-center gap-3">
              <VibehouseLogo />
              <span className="hidden xl:inline-block h-3.5 w-px bg-white/15" />
              <span className="hidden xl:inline-block font-mono text-[10px] font-medium uppercase tracking-wider text-white/50">
                Koramangala
              </span>
            </div>

            {/* Decisive Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2" aria-label="Main Navigation">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative px-4 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider transition-all rounded-full duration-200",
                      isActive
                        ? "text-white bg-white/[0.08] border border-white/15"
                        : "text-white/65 hover:text-white hover:bg-white/[0.04] border border-transparent"
                    )}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#E01E5A]" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right Action Cluster */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Profile / Sign In */}
              <div className="relative" ref={profileMenuRef}>
                {!shouldShowSignedInState ? (
                  <button
                    type="button"
                    onClick={() => openAuthModal("signin")}
                    className="hidden sm:inline-flex font-mono text-[11px] font-medium uppercase tracking-wider text-white/70 hover:text-white px-3 py-1.5 transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wider text-white px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/15 hover:border-white/30 transition-all cursor-pointer"
                  >
                    <CircleUserRound className="h-3.5 w-3.5 text-[#E01E5A]" />
                    <span className="max-w-[80px] truncate">{guestFirstName}</span>
                  </button>
                )}

                {/* Frosted Profile Menu Dropdown */}
                {isAuthenticated && isProfileMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-52 bg-[#16161C]/98 backdrop-blur-2xl rounded-xl p-2 border border-white/12 shadow-[0_16px_40px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-white/10 mb-1">
                      <p className="text-[10px] uppercase font-mono font-medium text-white/50 tracking-wider">Signed in as</p>
                      <p className="text-xs font-mono font-bold text-white truncate">{guest?.email || guestFirstName}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                    >
                      <span>My Profile</span>
                      <ChevronRight className="h-3 w-3 text-white/40" />
                    </Link>
                    <Link
                      href="/bookings"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                    >
                      <span>My Bookings</span>
                      <ChevronRight className="h-3 w-3 text-white/40" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-[#E01E5A] hover:bg-[#E01E5A]/10 rounded-lg transition-colors mt-1 border-t border-white/10 pt-2 cursor-pointer"
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>

              {/* Primary CTA */}
              <Link href={propertyHref} className="inline-block">
                <MagneticButton
                  className="bg-[#E01E5A] hover:bg-[#F02D6B] text-white rounded-full px-4 sm:px-5 py-2 sm:py-2.5 font-mono text-[11px] sm:text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_4px_16px_rgba(224,30,90,0.35)] active:scale-[0.98]"
                >
                  <span>Book Now</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </MagneticButton>
              </Link>

              {/* Mobile Hamburger Trigger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                className="lg:hidden flex items-center justify-center h-9 w-9 rounded-full bg-white/[0.06] border border-white/12 text-white hover:bg-white/15 transition-all cursor-pointer"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Cinematic Full-Screen Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 lg:hidden bg-black/98 backdrop-blur-2xl flex flex-col justify-between pt-28 pb-8 px-6 overflow-y-auto"
          >
            <div className="space-y-6 max-w-sm mx-auto w-full">
              <div className="border-b border-white/10 pb-4">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E01E5A] mb-1">
                  Social Sanctuary
                </p>
                <p className="text-xl font-display font-bold uppercase tracking-tight text-white">
                  Vibehouse
                </p>
              </div>

              <div className="flex flex-col space-y-2">
                {navItems.map((item, idx) => (
                  <motion.div
                    key={item.href}
                    initial={reducedMotion ? false : { opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.25 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between py-3 text-lg font-display font-bold uppercase tracking-[0.04em] transition-colors border-b border-white/6",
                        pathname === item.href ? "text-[#E01E5A]" : "text-white/80 hover:text-white"
                      )}
                    >
                      <span>{item.label}</span>
                      <ArrowRight className="h-4 w-4 opacity-50" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              {!shouldShowSignedInState ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal("signin");
                  }}
                  className="w-full py-3 text-center font-mono text-xs font-medium uppercase tracking-wider text-white/80 border border-white/15 rounded-full hover:bg-white/10 transition-colors"
                >
                  Sign In / Guest Portal
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-3 text-center font-mono text-xs font-medium uppercase tracking-wider text-white/80 border border-white/15 rounded-full hover:bg-white/10 transition-colors"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="py-3 px-4 text-center font-mono text-xs font-medium uppercase tracking-wider text-[#E01E5A] border border-[#E01E5A]/30 rounded-full hover:bg-[#E01E5A]/10 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            <div className="max-w-sm mx-auto w-full pt-6 border-t border-white/10 text-center">
              <Link
                href={propertyHref}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#E01E5A] hover:bg-[#F02D6B] text-white py-3.5 rounded-full font-mono text-xs font-semibold uppercase tracking-wider shadow-[0_4px_24px_rgba(224,30,90,0.4)] active:scale-[0.98]"
              >
                <span>Reserve A Stay</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-white/40">
                12th Main Rd, Koramangala · Bengaluru
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
