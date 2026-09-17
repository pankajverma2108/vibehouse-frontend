"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";

import {
  MOTION_DISTANCE,
  MOTION_SCALE,
  createMotionTransition,
  createReducedMotionTransition,
  createRevealVariants,
  createStaggerContainerVariants,
} from "@/lib/motion";
import { hostelNavItems } from "@/content/nav-menu";
import { navFontStyles } from "@/content/typography";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";
import { getScopedGuestHubHref } from "@/lib/guest-hub";
import { StaticAwareLink } from "@/components/static-export/static-aware-link";
import { cn } from "@/lib/utils";

type MobileNavTile = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  icon: string;
  colSpan: 1 | 2;
  accentColor: string;
  badge?: string;
  isDropdown?: boolean;
  requiresAuth?: boolean;
  external?: boolean;
};

const navIcons = {
  about: "/nav_design/icon-about.svg",
  colive: "/nav_design/icon-colive.svg",
  contact: "/nav_design/icon-contact.svg",
  events: "/nav_design/icon-events.svg",
  hostels: "/nav_design/icon-hostels.svg",
  invest: "/nav_design/icon-invest.svg",
  myStay: "/nav_design/icon-my-stay.svg",
  profile: "/nav_design/icon-profile.svg",
} as const;

const buildNavTiles = (propertyHref: string, activeGuestHubHref: string | null): MobileNavTile[] => [
  {
    id: "hostels",
    href: propertyHref,
    title: "HOSTELS",
    subtitle: "Find your room in Koramangala",
    icon: navIcons.hostels,
    colSpan: 2,
    accentColor: "var(--np-yellow)",
    badge: "SELECT",
    isDropdown: true,
  },
  {
    id: "colive",
    href: "/rooms",
    title: "COLIVE",
    subtitle: "Long stays & nomad suites",
    icon: navIcons.colive,
    colSpan: 1,
    accentColor: "var(--np-yellow)",
  },
  {
    id: "experiences",
    href: "/events",
    title: "EXPERIENCES",
    subtitle: "Events & community",
    icon: navIcons.events,
    colSpan: 1,
    accentColor: "var(--np-blue)",
  },
  {
    id: "invest",
    href: "/partner-with-us",
    title: "INVEST",
    subtitle: "Partner & build with us",
    icon: navIcons.invest,
    colSpan: 1,
    accentColor: "var(--np-green)",
  },
  ...(activeGuestHubHref
    ? [{
        id: "guest-hub",
        href: activeGuestHubHref,
        title: "GUEST HUB",
        subtitle: "During-stay access",
        icon: navIcons.myStay,
        colSpan: 1,
        accentColor: "var(--np-green)",
        requiresAuth: true,
      } satisfies MobileNavTile]
    : [{
        id: "contact",
        href: "mailto:thedailysocial01@gmail.com",
        title: "CONTACT",
        subtitle: "Get in touch with us",
        icon: navIcons.contact,
        colSpan: 1,
        accentColor: "var(--np-white-500)",
        external: true,
      } satisfies MobileNavTile]),
  {
    id: "my-stay",
    href: "/bookings",
    title: "MY BOOKINGS",
    subtitle: "View reservation details",
    icon: navIcons.myStay,
    colSpan: 1,
    accentColor: "var(--np-white-500)",
    requiresAuth: true,
  },
  {
    id: "profile",
    href: "/profile",
    title: "PROFILE",
    subtitle: "Guest account & KYC",
    icon: navIcons.profile,
    colSpan: 1,
    accentColor: "var(--np-white-500)",
    requiresAuth: true,
  },
  {
    id: "about",
    href: "/about",
    title: "ABOUT US",
    subtitle: "The Daily Social story & culture",
    icon: navIcons.about,
    colSpan: 2,
    accentColor: "var(--np-yellow)",
  },
];

const hostelProperties = hostelNavItems;

function MenuToggleButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-expanded={open}
      aria-label={open ? "Close menu" : "Open menu"}
      className="inline-flex h-9 w-9 items-center justify-center border border-[#3D3D3D] bg-[#161616] text-white hover:border-white transition-colors"
      onClick={onClick}
      type="button"
    >
      <span className={cn("relative h-3.5 w-3.5 transition-transform duration-300", open && "rotate-45")}>
        <span className={cn("absolute left-0 top-0 h-[4px] w-[4px] bg-current transition-all duration-200", open && "scale-90")} />
        <span className={cn("absolute right-0 top-0 h-[4px] w-[4px] bg-current transition-all duration-200", open && "scale-90")} />
        <span className={cn("absolute bottom-0 left-0 h-[4px] w-[4px] bg-current transition-all duration-200", open && "scale-90")} />
        <span className={cn("absolute bottom-0 right-0 h-[4px] w-[4px] bg-current transition-all duration-200", open && "scale-90")} />
      </span>
    </button>
  );
}

type MobileStaggeredMenuProps = {
  activeGuestHubBookingId?: null | string;
  isAuthenticated: boolean;
  onOpenSignIn: () => void;
};

export function MobileStaggeredMenu({ activeGuestHubBookingId = null, isAuthenticated, onOpenSignIn }: MobileStaggeredMenuProps) {
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const [hostelsExpanded, setHostelsExpanded] = useState(false);

  const resolveHostelHref = (href: string, propertyId: string) => {
    if (!href.startsWith("/property")) {
      return href;
    }

    return getDefaultPropertyDestinationHref(
      propertyId,
      "/property",
      searchParams.get("checkin"),
      searchParams.get("checkout"),
    );
  };

  const propertyHref = getDefaultPropertyDestinationHref(
    hostelNavItems[0]?.id,
    "/property",
    searchParams.get("checkin"),
    searchParams.get("checkout"),
  );

  const activeGuestHubHref = activeGuestHubBookingId ? getScopedGuestHubHref(activeGuestHubBookingId) : null;
  const navTiles = buildNavTiles(propertyHref, activeGuestHubHref);
  const tileVariants = createRevealVariants({
    reducedMotion,
    y: MOTION_DISTANCE.lg,
    scale: MOTION_SCALE.subtleEnter,
  });

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    if (open) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    setHostelsExpanded(false);
  };

  return (
    <div className="lg:hidden">
      <MenuToggleButton
        open={open}
        onClick={() => {
          if (open) {
            closeMenu();
            return;
          }

          setOpen(true);
        }}
      />

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <>
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    onClick={closeMenu}
                    transition={reducedMotion ? createReducedMotionTransition() : createMotionTransition("standard", "standard")}
                  />

                  <motion.aside
                    animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    className="fixed inset-0 z-[100] overflow-hidden bg-[#0D0D0D]"
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: "-8%" }}
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: "-6%" }}
                    transition={reducedMotion ? createReducedMotionTransition() : createMotionTransition("route", "enter")}
                  >
                    <div className="mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
                      <div className="pb-3 pt-1">
                        <div className="relative flex h-[60px] items-center justify-between border-b border-[#3D3D3D] px-1">
                          <button
                            aria-label="Close menu"
                            className="inline-flex h-9 w-9 items-center justify-center border border-[#3D3D3D] bg-[#161616] text-white hover:border-white transition-colors"
                            onClick={(event) => {
                              event.stopPropagation();
                              closeMenu();
                            }}
                            type="button"
                          >
                            <X className="h-5 w-5" strokeWidth={2.4} />
                          </button>

                          <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center">
                            <span className="text-[14px] font-extrabold uppercase tracking-[0.16em] text-white font-['Gilroy',sans-serif]">
                              Navigation
                            </span>
                          </div>

                          <span aria-hidden="true" className="inline-flex h-9 w-9" />
                        </div>
                      </div>

                      <motion.div
                        animate="show"
                        className="w-full pt-2"
                        initial="hidden"
                        variants={createStaggerContainerVariants({
                          reducedMotion,
                          stagger: "standard",
                          delayChildren: reducedMotion ? 0 : 0.04,
                        })}
                      >
                        <div className="grid grid-cols-2 gap-3 pb-8">
                          {navTiles.map((tile) => {
                            const isHostels = tile.id === "hostels";
                            const spanClass = tile.colSpan === 2 ? "col-span-2" : "col-span-1";

                            const content = (
                              <div className="w-full flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between w-full">
                                  <span className="inline-flex h-8 w-8 items-center justify-center border border-[#3D3D3D] bg-[#121212]">
                                    <Image alt={tile.title} className="h-4.5 w-4.5 object-contain" height={18} src={tile.icon} width={18} />
                                  </span>

                                  {tile.badge ? (
                                    <span className="inline-flex border border-black bg-[var(--np-yellow)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-black font-['Gilroy',sans-serif]">
                                      {tile.badge}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="mt-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      className="text-[16px] font-extrabold uppercase tracking-[0.06em] text-white font-['Gilroy',sans-serif]"
                                      style={{ color: tile.accentColor }}
                                    >
                                      {tile.title}
                                    </span>
                                    {isHostels ? (
                                      <ChevronDown
                                        className={cn(
                                          "h-4 w-4 text-white/80 transition-transform duration-300",
                                          hostelsExpanded && "rotate-180"
                                        )}
                                      />
                                    ) : null}
                                  </div>
                                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.04em] text-white/60 font-['Gilroy',sans-serif]">
                                    {tile.subtitle}
                                  </p>
                                </div>
                              </div>
                            );

                            return (
                              <motion.div
                                key={tile.id}
                                className={cn(spanClass)}
                                variants={tileVariants}
                              >
                                <div className="relative border border-[#3D3D3D] bg-[#161616] p-4 shadow-[3px_3px_0px_#000000] transition-transform active:translate-x-[2px] active:translate-y-[2px]">
                                  {isHostels ? (
                                    <button
                                      className="flex min-h-[110px] w-full cursor-pointer flex-col items-start justify-between text-left"
                                      onClick={() => setHostelsExpanded((value) => !value)}
                                      type="button"
                                    >
                                      {content}
                                    </button>
                                  ) : tile.external ? (
                                    <a
                                      className="flex min-h-[110px] w-full cursor-pointer flex-col items-start justify-between text-left"
                                      href={tile.href}
                                      onClick={closeMenu}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      {content}
                                    </a>
                                  ) : (
                                    <StaticAwareLink
                                      className="flex min-h-[110px] w-full cursor-pointer flex-col items-start justify-between text-left"
                                      href={tile.href}
                                      onClick={(event) => {
                                        if (tile.requiresAuth && !isAuthenticated) {
                                          event.preventDefault();
                                          closeMenu();
                                          onOpenSignIn();
                                          return;
                                        }

                                        closeMenu();
                                      }}
                                    >
                                      {content}
                                    </StaticAwareLink>
                                  )}

                                  {isHostels && hostelsExpanded ? (
                                    <AnimatePresence>
                                      <motion.div
                                        animate={{ height: "auto", opacity: 1 }}
                                        className="overflow-hidden"
                                        exit={{ height: 0, opacity: 0 }}
                                        initial={{ height: 0, opacity: 0 }}
                                        transition={reducedMotion ? createReducedMotionTransition() : createMotionTransition("moderate", "standard")}
                                      >
                                        <div className="mt-3 pt-3 border-t border-[#3D3D3D] flex flex-col gap-2">
                                          {hostelProperties.map((property) => (
                                            <Link
                                              key={property.id}
                                              href={resolveHostelHref(property.href, property.id)}
                                              className="text-xs font-bold uppercase tracking-[0.06em] text-white/80 hover:text-[var(--np-yellow)] transition-colors py-1 flex items-center gap-2 font-['Gilroy',sans-serif]"
                                              onClick={closeMenu}
                                            >
                                              <span className="h-1.5 w-1.5 bg-[var(--np-yellow)]" />
                                              {property.label}
                                            </Link>
                                          ))}
                                        </div>
                                      </motion.div>
                                    </AnimatePresence>
                                  ) : null}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    </div>
                  </motion.aside>
                </>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
