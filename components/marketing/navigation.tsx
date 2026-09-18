"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { CircleUserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import {
  MOTION_DISTANCE,
  createMotionTransition,
  createReducedMotionTransition,
} from "@/lib/motion";
import { hostelNavItems } from "@/content/nav-menu";
import { siteMeta } from "@/content/site";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";
import { isStandalonePublicRoute } from "@/lib/feedback-route";
import { getActiveGuestHubBooking } from "@/lib/guest-hub";
import { Button } from "@/components/neopop";
import { CredBrandLogo, CredExpandTrigger, CredMegaMenuOverlay } from "./cred-mega-menu";
import { cn } from "@/lib/utils";

function isGuestHubRoute(pathname: string): boolean {
  return pathname === "/guest" || pathname.startsWith("/guest/") || /^\/[^/]+\/guest(?:\/|$)/.test(pathname);
}

export function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion() ?? false;
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const { guest, isAuthenticated, isRestoringSession, openAuthModal, signOut } = useGuestAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const shouldShowSignedInState = isAuthenticated || isRestoringSession;
  const activeGuestHubBooking = useMemo(() => getActiveGuestHubBooking(guest?.bookings ?? []), [guest?.bookings]);
  const guestFirstName = useMemo(() => {
    const firstToken = guest?.name?.trim().split(/\s+/)[0];
    return firstToken || "Profile";
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
    let lastY = window.scrollY;

    const onScroll = () => {
      const currentY = window.scrollY;
      const goingDown = currentY > lastY + 6;
      const goingUp = currentY < lastY - 6;

      setIsScrolled(currentY > 24);

      if (currentY < 48 || goingUp) {
        setIsVisible(true);
      } else if (goingDown) {
        setIsVisible(false);
      }

      lastY = currentY;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  if (isGuestHubRoute(pathname) || isStandalonePublicRoute(pathname)) {
    return null;
  }

  return (
    <>
      <motion.nav
        animate={
          reducedMotion
            ? { opacity: isVisible ? 1 : 0 }
            : { opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -MOTION_DISTANCE.xxl }
        }
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
          !isVisible && "pointer-events-none",
          isScrolled
            ? "border-b border-white/10 bg-black/90 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.8)]"
            : "bg-transparent"
        )}
        initial={false}
        transition={reducedMotion ? createReducedMotionTransition() : createMotionTransition("moderate", "standard")}
      >
        <div className="w-full px-6 sm:px-10 md:px-14 py-4 flex items-center justify-between">
          {/* Exact CRED Logo Positioning (Left) */}
          <CredBrandLogo />

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Quick Profile / Sign In */}
            <div className="relative" ref={profileMenuRef}>
              {!shouldShowSignedInState ? (
                <button
                  type="button"
                  onClick={() => openAuthModal("signin")}
                  className="hidden sm:inline-flex text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/70 hover:text-white px-2 py-1 transition-colors font-['Gilroy',sans-serif]"
                >
                  Sign In
                </button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isRestoringSession && !isAuthenticated}
                  onClick={() => setIsProfileMenuOpen((val) => !val)}
                  startIcon={<CircleUserRound className="h-4 w-4" />}
                >
                  {isRestoringSession && !isAuthenticated ? "Profile" : guestFirstName}
                </Button>
              )}

              {isAuthenticated && isProfileMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[220px] border border-[#3D3D3D] bg-[#121212] p-1.5 shadow-[4px_4px_0px_#000000]">
                  <Link
                    href="/bookings"
                    className="block px-3.5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-white/90 hover:bg-[#161616] hover:text-[var(--np-yellow)] transition-colors font-['Gilroy',sans-serif]"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    My Bookings
                  </Link>
                  <Link
                    href="/profile"
                    className="block px-3.5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-white/90 hover:bg-[#161616] hover:text-[var(--np-yellow)] transition-colors font-['Gilroy',sans-serif]"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  <button
                    className="block w-full text-left px-3.5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-[var(--np-red)] hover:bg-[#161616] transition-colors font-['Gilroy',sans-serif]"
                    onClick={() => {
                      signOut();
                      setIsProfileMenuOpen(false);
                    }}
                    type="button"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>

            {/* Affirmative CTA */}
            <Button asChild size="sm" variant="primary">
              <Link href={propertyHref}>
                Book Now
              </Link>
            </Button>

            {/* Exact CRED Header Expand Trigger Box (Right) */}
            <CredExpandTrigger
              isOpen={isMegaMenuOpen}
              onClick={() => setIsMegaMenuOpen(true)}
            />
          </div>
        </div>
      </motion.nav>

      {/* Full CRED Mega Menu Overlay */}
      <CredMegaMenuOverlay
        isOpen={isMegaMenuOpen}
        onClose={() => setIsMegaMenuOpen(false)}
        isAuthenticated={shouldShowSignedInState}
        onOpenSignIn={() => openAuthModal("signin")}
      />
    </>
  );
}
