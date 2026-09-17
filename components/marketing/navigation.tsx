"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight, CircleUserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { MobileStaggeredMenu } from "./mobile-staggered-menu";
import {
  MOTION_DISTANCE,
  createMotionTransition,
  createReducedMotionTransition,
  createRevealVariants,
  createStaggerContainerVariants,
} from "@/lib/motion";
import { hostelNavItems } from "@/content/nav-menu";
import { siteMeta } from "@/content/site";
import { navFontStyles } from "@/content/typography";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";
import { isStandalonePublicRoute } from "@/lib/feedback-route";
import { getActiveGuestHubBooking, getScopedGuestHubHref } from "@/lib/guest-hub";
import { StaticAwareLink } from "@/components/static-export/static-aware-link";
import { Button } from "@/components/neopop";
import { cn } from "@/lib/utils";

type DesktopNavLink = {
  label: string;
  href: string;
  description?: string;
  external?: boolean;
  requiresAuth?: boolean;
};

type DesktopNavCard = {
  label: string;
  accentColor: string;
  links: DesktopNavLink[];
};

function matchesNavLink(pathname: string, searchParams: Pick<URLSearchParams, "get">, href: string): boolean {
  if (!href.startsWith("/")) {
    return false;
  }

  const resolvedHref = new URL(href, "https://vibehouse.local");
  const targetPathname = resolvedHref.pathname;

  if (pathname !== targetPathname && !pathname.startsWith(`${targetPathname}/`)) {
    return false;
  }

  for (const [key, value] of resolvedHref.searchParams.entries()) {
    if (searchParams.get(key) !== value) {
      return false;
    }
  }

  return true;
}

const hostelCardLinks: DesktopNavLink[] = hostelNavItems.map((property) => ({
  label: property.label,
  href: property.href,
  description: "Koramangala",
}));

const desktopNavCards: DesktopNavCard[] = [
  {
    label: "Hostels",
    accentColor: "var(--np-yellow)",
    links: [
      ...hostelCardLinks,
      { label: "Colive", href: "/rooms?type=colive", description: "Long stay setup" },
    ],
  },
  {
    label: "Experiences",
    accentColor: "var(--np-blue)",
    links: [
      { label: "Experience Calendar", href: "/events", description: "Weekly highlights" },
      { label: "About Us", href: "/about", description: "The Daily Social story" },
      { label: "Invest & Partner", href: "/partner-with-us", description: "Build with us" },
      { label: "Contact Us", href: siteMeta.contact.emailHref, description: "Say hello", external: true },
    ],
  },
  {
    label: "Guest Hub",
    accentColor: "var(--np-green)",
    links: [
      { label: "My Bookings", href: "/bookings", requiresAuth: true },
      { label: "My Hub", href: "/guest", requiresAuth: true },
      { label: "Profile", href: "/profile", requiresAuth: true },
    ],
  },
];

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
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);
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

      setIsScrolled(currentY > 18);

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
    if (!isProfileMenuOpen) {
      return;
    }

    const onWindowClick = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", onWindowClick);
    return () => window.removeEventListener("mousedown", onWindowClick);
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (!isDesktopMenuOpen) {
      return;
    }

    const onWindowClick = (event: MouseEvent) => {
      if (!desktopMenuRef.current?.contains(event.target as Node)) {
        setIsDesktopMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDesktopMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", onWindowClick);
    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("mousedown", onWindowClick);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isDesktopMenuOpen]);

  if (isGuestHubRoute(pathname) || isStandalonePublicRoute(pathname)) {
    return null;
  }

  return (
    <motion.nav
      animate={reducedMotion ? { opacity: isVisible ? 1 : 0 } : { opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -MOTION_DISTANCE.xxl }}
      className={cn("fixed inset-x-0 top-3 z-50", !isVisible && "pointer-events-none")}
      initial={false}
      transition={reducedMotion ? createReducedMotionTransition() : createMotionTransition("moderate", "standard")}
    >
      <div className="vh-container">
        <div className="mx-auto hidden max-w-7xl lg:block">
          <div
            ref={desktopMenuRef}
            className={cn(
              "relative overflow-visible border border-[#3D3D3D] transition-all duration-200",
              isScrolled
                ? "bg-[#0D0D0D]/95 shadow-[0_16px_36px_rgba(0,0,0,0.85)] backdrop-blur-xl"
                : "bg-[#0D0D0D]/90 backdrop-blur-md",
            )}
          >
            <div className="relative grid h-[60px] grid-cols-[auto_1fr_auto] items-center px-3.5">
              <button
                aria-expanded={isDesktopMenuOpen}
                aria-label={isDesktopMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                className="group inline-flex h-9 w-9 items-center justify-center border border-[#3D3D3D] bg-[#161616] text-white hover:border-white transition-colors"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsDesktopMenuOpen((value) => !value);
                }}
                type="button"
              >
                <span className={cn("relative h-3.5 w-3.5 transition-transform duration-300", isDesktopMenuOpen && "rotate-45")}> 
                  <span className={cn("absolute left-0 top-0 h-[4px] w-[4px] bg-current transition-all duration-200", isDesktopMenuOpen && "scale-90")} />
                  <span className={cn("absolute right-0 top-0 h-[4px] w-[4px] bg-current transition-all duration-200", isDesktopMenuOpen && "scale-90")} />
                  <span className={cn("absolute bottom-0 left-0 h-[4px] w-[4px] bg-current transition-all duration-200", isDesktopMenuOpen && "scale-90")} />
                  <span className={cn("absolute bottom-0 right-0 h-[4px] w-[4px] bg-current transition-all duration-200", isDesktopMenuOpen && "scale-90")} />
                </span>
              </button>

              <Link href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                <span className="sr-only">{siteMeta.name}</span>
                <span aria-hidden="true" className="block text-center text-[15px] font-extrabold uppercase tracking-[0.14em] text-white font-['Gilroy',sans-serif]">
                  THE DAILY SOCIAL
                </span>
              </Link>

              <div className="ml-auto flex items-center gap-3">
                <div className="relative" ref={profileMenuRef}>
                  {!shouldShowSignedInState ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openAuthModal("signin")}
                    >
                      Sign In
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isRestoringSession && !isAuthenticated}
                      onClick={() => {
                        setIsDesktopMenuOpen(false);
                        setIsProfileMenuOpen((value) => !value);
                      }}
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
                          setIsDesktopMenuOpen(false);
                        }}
                        type="button"
                      >
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>

                <Button
                  asChild
                  size="sm"
                  variant="primary"
                >
                  <Link href={propertyHref}>
                    Book Now
                  </Link>
                </Button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isDesktopMenuOpen ? (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden border-t border-[#3D3D3D]"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={reducedMotion ? createReducedMotionTransition() : createMotionTransition("route", "enter")}
                >
                  <motion.div
                    animate="show"
                    className="grid grid-cols-3 gap-3 p-3 bg-[#0D0D0D]"
                    initial="hidden"
                    variants={createStaggerContainerVariants({ reducedMotion })}
                  >
                    {desktopNavCards.map((card) => (
                      <motion.article
                        key={card.label}
                        className="flex min-h-[210px] flex-col border border-[#3D3D3D] bg-[#161616] p-5 shadow-[4px_4px_0px_#000000]"
                        variants={createRevealVariants({ reducedMotion, y: MOTION_DISTANCE.lg })}
                      >
                        <h3
                          className="text-[20px] font-extrabold uppercase tracking-[0.08em] pb-3 border-b border-[#3D3D3D]"
                          style={{ color: card.accentColor, ...navFontStyles.desktopCardTitle }}
                        >
                          {card.label}
                        </h3>

                        <div className="mt-4 flex flex-col gap-2.5">
                          {card.links.map((link, linkIndex) => {
                            const resolvedHref = link.href === "/guest" && activeGuestHubBooking
                              ? getScopedGuestHubHref(activeGuestHubBooking.ezee_reservation_id)
                              : link.href;

                            if (link.external) {
                              return (
                                <a
                                  key={`${card.label}-${resolvedHref}-${linkIndex}`}
                                  className="inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.06em] text-white/75 transition-colors hover:text-white"
                                  href={resolvedHref}
                                  rel="noreferrer"
                                  target="_blank"
                                  onClick={() => setIsDesktopMenuOpen(false)}
                                >
                                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                                  <span>{link.label}</span>
                                </a>
                              );
                            }

                            const active = matchesNavLink(pathname, searchParams, resolvedHref);

                            return (
                              <StaticAwareLink
                                key={`${card.label}-${resolvedHref}-${linkIndex}`}
                                className={cn(
                                  "inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.06em] transition-colors hover:text-white",
                                  active ? "text-[var(--np-yellow)] font-bold" : "text-white/75"
                                )}
                                href={resolvedHref}
                                onClick={(event) => {
                                  if (link.requiresAuth && !shouldShowSignedInState) {
                                    event.preventDefault();
                                    setIsDesktopMenuOpen(false);
                                    openAuthModal("signin");
                                    return;
                                  }

                                  setIsDesktopMenuOpen(false);
                                }}
                              >
                                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                                <span>{link.label}</span>
                              </StaticAwareLink>
                            );
                          })}
                        </div>
                      </motion.article>
                    ))}
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl items-center lg:hidden">
          <div className="flex w-full items-center justify-between border border-[#3D3D3D] bg-[#0D0D0D]/95 px-3 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            <Link href="/" className="flex items-center justify-center whitespace-nowrap px-1 py-0.5 leading-none" aria-label={siteMeta.name}>
              <span aria-hidden="true" className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-white font-['Gilroy',sans-serif]">
                THE DAILY SOCIAL
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="primary">
                <Link href={propertyHref}>
                  Book Now
                </Link>
              </Button>
              <MobileStaggeredMenu activeGuestHubBookingId={activeGuestHubBooking?.ezee_reservation_id ?? null} isAuthenticated={shouldShowSignedInState} onOpenSignIn={() => openAuthModal("signin")} />
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
