"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight, CircleUserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { MobileStaggeredMenu } from "./mobile-staggered-menu";
import { hostelNavItems } from "@/content/nav-menu";
import { siteMeta } from "@/content/site";
import { navFontStyles } from "@/content/typography";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";
import { getActiveGuestHubBooking } from "@/lib/guest-hub";
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
  bgColor: string;
  textColor: string;
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
    bgColor: "var(--vh-pink)",
    textColor: "#FFFFFF",
    links: [
      ...hostelCardLinks,
      { label: "Colive", href: "/rooms?type=colive", description: "Long stay setup" },
    ],
  },
  {
    label: "Experiences",
    bgColor: "var(--vh-cyan)",
    textColor: "#0f172a",
    links: [
      { label: "Experience Calendar", href: "/events", description: "Weekly highlights" },
      { label: "About Us", href: "/about", description: "The Daily Social story" },
      { label: "Invest & Partner", href: "/partner-with-us", description: "Build with us" },
      { label: "Contact Us", href: siteMeta.contact.emailHref, description: "Say hello", external: true },
    ],
  },
  {
    label: "Guest Hub",
    bgColor: "var(--vh-lime)",
    textColor: "#0f172a",
    links: [
      { label: "My Bookings", href: "/bookings", requiresAuth: true },
      { label: "My Hub", href: "/guest", requiresAuth: true },
      { label: "Profile", href: "/profile", requiresAuth: true },
    ],
  },
];

export function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  return (
    <motion.nav
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -110 }}
      className="fixed inset-x-0 top-4 z-50"
      initial={false}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="vh-container">
        <div className="mx-auto hidden max-w-7xl lg:block">
          <div
            ref={desktopMenuRef}
            className={cn(
              "relative overflow-visible rounded-2xl transition-all duration-200",
              isScrolled
                ? "border border-white/12 bg-[rgba(15,16,26,0.92)] shadow-[0_20px_50px_rgba(0,0,0,0.34)] backdrop-blur-xl"
                : "border border-transparent bg-[rgba(15,16,26,0.72)]",
            )}
          >
            <div className="relative grid h-[60px] grid-cols-[auto_1fr_auto] items-center px-3">
              <button
                aria-expanded={isDesktopMenuOpen}
                aria-label={isDesktopMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                className="group inline-flex h-10 w-10 items-center justify-center rounded-lg text-white"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsDesktopMenuOpen((value) => !value);
                }}
                type="button"
              >
                <span className={cn("relative h-3.5 w-3.5 transition-transform duration-300", isDesktopMenuOpen && "rotate-45")}> 
                  <span className={cn("absolute left-0 top-0 h-[5px] w-[5px] rounded-full bg-current transition-all duration-200", isDesktopMenuOpen && "scale-90")} />
                  <span className={cn("absolute right-0 top-0 h-[5px] w-[5px] rounded-full bg-current transition-all duration-200", isDesktopMenuOpen && "scale-90")} />
                  <span className={cn("absolute bottom-0 left-0 h-[5px] w-[5px] rounded-full bg-current transition-all duration-200", isDesktopMenuOpen && "scale-90")} />
                  <span className={cn("absolute bottom-0 right-0 h-[5px] w-[5px] rounded-full bg-current transition-all duration-200", isDesktopMenuOpen && "scale-90")} />
                </span>
              </button>

              <Link href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                <span className="sr-only">{siteMeta.name}</span>
                <span aria-hidden="true" className="vh-retro-sign-flat block text-center text-[16px] leading-none text-[var(--vh-ice)]">
                  THE DAILY SOCIAL
                </span>
              </Link>

              <div className="ml-auto flex items-center gap-2.5">
                <div className="relative" ref={profileMenuRef}>
                  {!shouldShowSignedInState ? (
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/20 bg-[var(--vh-pink)] px-3.5 text-sm font-semibold text-white shadow-[0px_-1px_0px_0px_#FFFFFF40_inset,_0px_1px_0px_0px_#FFFFFF40_inset] transition hover:bg-[var(--vh-pink-soft)]"
                      onClick={() => openAuthModal("signin")}
                      type="button"
                    >
                      Sign In
                    </button>
                  ) : (
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--vh-pink)]/45 bg-[rgba(35,15,20,0.82)] px-3 text-sm font-semibold text-white transition hover:bg-[rgba(198,40,40,0.16)]"
                      disabled={isRestoringSession && !isAuthenticated}
                      onClick={() => {
                        setIsDesktopMenuOpen(false);
                        setIsProfileMenuOpen((value) => !value);
                      }}
                      type="button"
                    >
                      <CircleUserRound className="h-4.5 w-4.5" />
                      <span>{isRestoringSession && !isAuthenticated ? "Profile" : guestFirstName}</span>
                    </button>
                  )}

                  {isAuthenticated && isProfileMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[216px] rounded-[20px] border border-white/15 bg-[#06090f] p-2 shadow-[0_20px_48px_rgba(0,0,0,0.45)]">
                      <Link
                        href="/bookings"
                        className="block rounded-xl px-4 py-3 text-base font-semibold text-white/90 transition hover:bg-white/8"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        My Bookings
                      </Link>
                      <Link
                        href="/profile"
                        className="block rounded-xl px-4 py-3 text-base font-semibold text-white/90 transition hover:bg-white/8"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        My Profile
                      </Link>
                      <button
                        className="block w-full rounded-xl px-4 py-3 text-left text-base font-semibold text-[#f6b3c8] transition hover:bg-white/8"
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

              <Link
                href={propertyHref}
                className="inline-flex h-9 items-center rounded-lg bg-[var(--vh-pink)] px-3.5 text-sm font-semibold text-white shadow-[0px_-1px_0px_0px_#FFFFFF40_inset,_0px_1px_0px_0px_#FFFFFF40_inset] transition hover:bg-[var(--vh-pink-soft)]"
              >
                Book Now
              </Link>
            </div>
            </div>

            <AnimatePresence initial={false}>
              {isDesktopMenuOpen ? (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden border-t border-white/10"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.div
                    animate="show"
                    className="grid grid-cols-3 gap-3 p-3"
                    initial="hidden"
                    variants={{
                      hidden: {},
                      show: {
                        transition: {
                          staggerChildren: 0.08,
                        },
                      },
                    }}
                  >
                    {desktopNavCards.map((card) => (
                      <motion.article
                        key={card.label}
                        className="flex min-h-[206px] flex-col rounded-[14px] border border-black/15 p-4"
                        style={{ backgroundColor: card.bgColor, color: card.textColor }}
                        variants={{
                          hidden: { opacity: 0, y: 18 },
                          show: { opacity: 1, y: 0 },
                        }}
                      >
                        <h3 className="text-[30px] leading-[34px]" style={navFontStyles.desktopCardTitle}>
                          {card.label}
                        </h3>

                        <div className="mt-4 flex flex-col gap-2.5">
                          {card.links.map((link, linkIndex) => {
                            if (link.external) {
                              return (
                                <a
                                  key={`${card.label}-${link.href}-${linkIndex}`}
                                  className="inline-flex items-center gap-1.5 text-[15px] transition-opacity hover:opacity-100"
                                  href={link.href}
                                  rel="noreferrer"
                                  style={{ ...navFontStyles.desktopCardLink, color: card.textColor, opacity: 0.88 }}
                                  target="_blank"
                                  onClick={() => setIsDesktopMenuOpen(false)}
                                >
                                  <ArrowUpRight className="h-4 w-4 shrink-0" />
                                  <span>{link.label}</span>
                                </a>
                              );
                            }

                            const active = matchesNavLink(pathname, searchParams, link.href);

                            return (
                              <Link
                                key={`${card.label}-${link.href}-${linkIndex}`}
                                className="inline-flex items-center gap-1.5 text-[15px] transition-opacity hover:opacity-100"
                                href={link.href}
                                style={{ ...navFontStyles.desktopCardLink, color: card.textColor, opacity: active ? 1 : 0.88 }}
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
                                <ArrowUpRight className="h-4 w-4 shrink-0" />
                                <span>{link.label}</span>
                              </Link>
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
          <div className="flex w-full items-center justify-between rounded-full border border-white/12 bg-[rgba(15,16,26,0.88)] px-2.5 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <Link href="/" className="flex items-center justify-center whitespace-nowrap px-2 py-0.5 leading-none" aria-label={siteMeta.name}>
              <span aria-hidden="true" className="vh-retro-sign-flat text-[14px] font-bold tracking-[0.12em] text-[var(--vh-ice)]">
                THE DAILY SOCIAL
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href={propertyHref}
                className="rounded-full bg-[var(--vh-pink)] px-3.5 py-2 text-xs font-medium whitespace-nowrap text-white shadow-[0px_-1px_0px_0px_#FFFFFF40_inset,_0px_1px_0px_0px_#FFFFFF40_inset]"
              >
                Book Now
              </Link>
              <MobileStaggeredMenu activeGuestHubBookingId={activeGuestHubBooking?.ezee_reservation_id ?? null} isAuthenticated={shouldShowSignedInState} onOpenSignIn={() => openAuthModal("signin")} />
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
