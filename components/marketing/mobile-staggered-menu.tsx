"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";

import { StickerTag } from "@/components/shared/sticker-tag";
import { hostelNavItems } from "@/content/nav-menu";
import { navFontStyles } from "@/content/typography";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";
import { getScopedGuestHubHref } from "@/lib/guest-hub";
import { cn } from "@/lib/utils";

type MobileNavTile = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  icon: string;
  colSpan: 1 | 2;
  bgClass: string;
  overlayClass: string;
  borderClass: string;
  titleClass: string;
  subtitleClass: string;
  iconBgClass: string;
  rotationClass: string;
  isDropdown?: boolean;
  requiresAuth?: boolean;
  external?: boolean;
  badgeNew?: string;
  stickerLabel?: string;
  stickerBg?: string;
  stickerText?: string;
  stickerRotate?: string;
};

const navIcons = {
  about: "/nav_design/icon-about.svg",
  chevron: "/nav_design/icon-chevron-down.svg",
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
    subtitle: "find your corner...",
    icon: navIcons.hostels,
    colSpan: 2,
    bgClass: "bg-[#ff2e62]",
    overlayClass: "bg-[rgba(35,15,20,0.1)]",
    borderClass: "border-2 border-dashed border-[rgba(255,255,255,0.3)]",
    titleClass: "text-white",
    subtitleClass: "text-[rgba(255,255,255,0.8)]",
    iconBgClass: "bg-[rgba(255,255,255,0.2)]",
    rotationClass: "-rotate-1",
    badgeNew: "NEW",
    isDropdown: true,
    stickerLabel: "Book Now!",
    stickerBg: "#FEF08A",
    stickerText: "#230f14",
    stickerRotate: "rotate-[9deg]",
  },
  {
    id: "colive",
    href: "/rooms",
    title: "COLIVE",
    subtitle: "stay a while",
    icon: navIcons.colive,
    colSpan: 1,
    bgClass: "bg-[#facc15]",
    overlayClass: "bg-[rgba(35,15,20,0.05)]",
    borderClass: "border-2 border-dashed border-[rgba(0,0,0,0.1)]",
    titleClass: "text-[#230f14]",
    subtitleClass: "text-[rgba(35,15,20,0.6)]",
    iconBgClass: "bg-[rgba(0,0,0,0.08)]",
    rotationClass: "rotate-1",
    // stickerLabel: "Stay Longer",
    // stickerBg: "#FB7185",
    // stickerText: "#230f14",
    // stickerRotate: "rotate-[0deg]",
  },
  {
    id: "experiences",
    href: "/events",
    title: "EXPERIENCES",
    subtitle: "what's poppin?",
    icon: navIcons.events,
    colSpan: 1,
    bgClass: "bg-[#00d1ff]",
    overlayClass: "bg-[rgba(35,15,20,0.1)]",
    borderClass: "border-2 border-dashed border-[rgba(255,255,255,0.3)]",
    titleClass: "text-white",
    subtitleClass: "text-[rgba(255,255,255,0.8)]",
    iconBgClass: "bg-[rgba(255,255,255,0.2)]",
    rotationClass: "-rotate-1",
    // stickerLabel: "Tonight",
    // stickerBg: "#FDE68A",
    // stickerText: "#230f14",
    // stickerRotate: "rotate-[0deg]",
  },
  {
    id: "invest",
    href: "/partner-with-us",
    title: "INVEST",
    subtitle: "partner up",
    icon: navIcons.invest,
    colSpan: 1,
    bgClass: "bg-[#39ff14]",
    overlayClass: "bg-[rgba(35,15,20,0.1)]",
    borderClass: "border-2 border-dashed border-[rgba(0,0,0,0.1)]",
    titleClass: "text-[#230f14]",
    subtitleClass: "text-[rgba(35,15,20,0.6)]",
    iconBgClass: "bg-[rgba(0,0,0,0.08)]",
    rotationClass: "rotate-1",
    // stickerLabel: "Partner Up",
    // stickerBg: "#DCFCE7",
    // stickerText: "#0f172a",
    // stickerRotate: "rotate-[0deg]",
  },
  ...(activeGuestHubHref
    ? [{
        id: "guest-hub",
        href: activeGuestHubHref,
        title: "GUEST HUB",
        subtitle: "during-stay access",
        icon: navIcons.myStay,
        colSpan: 1,
        bgClass: "bg-[#ff2e62]",
        overlayClass: "bg-[rgba(35,15,20,0.1)]",
        borderClass: "border-2 border-dashed border-[rgba(255,255,255,0.3)]",
        titleClass: "text-white",
        subtitleClass: "text-[rgba(255,255,255,0.8)]",
        iconBgClass: "bg-[rgba(255,255,255,0.2)]",
        rotationClass: "-rotate-2",
        requiresAuth: true,
      } satisfies MobileNavTile]
    : [{
        id: "contact",
        href: "mailto:thedailysocial01@gmail.com",
        title: "CONTACT",
        subtitle: "get in touch",
        icon: navIcons.contact,
        colSpan: 1,
        bgClass: "bg-[#ff2e62]",
        overlayClass: "bg-[rgba(35,15,20,0.1)]",
        borderClass: "border-2 border-dashed border-[rgba(255,255,255,0.3)]",
        titleClass: "text-white",
        subtitleClass: "text-[rgba(255,255,255,0.8)]",
        iconBgClass: "bg-[rgba(255,255,255,0.2)]",
        rotationClass: "-rotate-2",
        external: true,
      } satisfies MobileNavTile]),
  {
    id: "my-stay",
    href: "/bookings",
    title: "MY BOOKINGS",
    subtitle: "all your stays",
    icon: navIcons.myStay,
    colSpan: 1,
    bgClass: "bg-[#1e293b]",
    overlayClass: "bg-[rgba(51,65,85,0.5)]",
    borderClass: "border border-dashed border-[#64748b]",
    titleClass: "text-white",
    subtitleClass: "text-[rgba(255,255,255,0.6)]",
    iconBgClass: "bg-[rgba(255,255,255,0.2)]",
    rotationClass: "rotate-1",
    requiresAuth: true,
    // stickerLabel: "Trip Log",
    // stickerBg: "#FBCFE8",
    // stickerText: "#0f172a",
    // stickerRotate: "-rotate-[0deg]",
  },
  {
    id: "profile",
    href: "/profile",
    title: "PROFILE",
    subtitle: "your details",
    icon: navIcons.profile,
    colSpan: 1,
    bgClass: "bg-white",
    overlayClass: "bg-[#f1f5f9]",
    borderClass: "border border-dashed border-[#cbd5e1]",
    titleClass: "text-[#1e293b]",
    subtitleClass: "text-[#64748b]",
    iconBgClass: "bg-[rgba(100,116,139,0.18)]",
    rotationClass: "-rotate-1",
    requiresAuth: true,
    // stickerLabel: "You",
    // stickerBg: "#E2E8F0",
    // stickerText: "#0f172a",
    // stickerRotate: "rotate-[0deg]",
  },
  {
    id: "about",
    href: "/about",
    title: "ABOUT US",
    subtitle: "our story",
    icon: navIcons.about,
    colSpan: 2,
    bgClass: "bg-[#00d1ff]",
    overlayClass: "bg-[rgba(35,15,20,0.1)]",
    borderClass: "border-2 border-dashed border-[rgba(255,255,255,0.3)]",
    titleClass: "text-white",
    subtitleClass: "text-[rgba(255,255,255,0.8)]",
    iconBgClass: "bg-[rgba(255,255,255,0.2)]",
    rotationClass: "rotate-1",
    // stickerLabel: "Meet Us",
    // stickerBg: "#FEF08A",
    // stickerText: "#0f172a",
    // stickerRotate: "-rotate-[0deg]",
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
  const dotIndexes = [0, 1, 2, 3] as const;

  const getPosition = (dotIndex: number) => {
    if (!open) {
      const row = Math.floor(dotIndex / 2);
      const col = dotIndex % 2;
      return { x: col * 8, y: row * 8 };
    }

    const openPositions: Record<number, { x: number; y: number }> = {
      0: { x: 0, y: 0 },
      1: { x: 8, y: 8 },
      2: { x: 0, y: 8 },
      3: { x: 8, y: 0 },
    };

    return openPositions[dotIndex];
  };

  return (
    <button
      aria-expanded={open}
      aria-label={open ? "Close menu" : "Open menu"}
      className="relative inline-flex h-10 w-10 items-center justify-center text-[#F1F5F9]"
      onClick={onClick}
      type="button"
    >
      <span className="relative h-3.5 w-3.5">
        {dotIndexes.map((dotIndex) => {
          const { x, y } = getPosition(dotIndex);

          return (
            <motion.span
              key={dotIndex}
              animate={{
                x,
                y,
                opacity: 1,
                scale: open ? 0.92 : 1,
              }}
              className="absolute left-0 top-0 h-[5px] w-[5px] rounded-full bg-white"
              initial={false}
              transition={{ duration: 0.24, ease: "easeOut" }}
            />
          );
        })}
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
    <div className="md:hidden">
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
                    className="fixed inset-0 z-[90] bg-black/65"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    onClick={closeMenu}
                  />

                  <motion.aside
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed inset-0 z-[100] overflow-hidden bg-[#07070a]"
                    exit={{ opacity: 0, y: "-10%" }}
                    initial={{ opacity: 0, y: "-8%" }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-y-auto px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))]">
                      <div className="pb-2 pt-1">
                        <div className="relative flex h-[78px] items-center justify-between px-1">
                          <button
                            aria-label="Close menu"
                            className="inline-flex h-10 w-10 items-center justify-center text-[#F1F5F9] transition hover:text-white"
                            onClick={(event) => {
                              event.stopPropagation();
                              closeMenu();
                            }}
                            type="button"
                          >
                            <X className="h-7 w-7" strokeWidth={2.4} />
                          </button>

                          <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center">
                            <span className="text-[24px] leading-9 text-[#F1F5F9]" style={navFontStyles.menuHeading}>
                              Menu
                            </span>
                          </div>

                          <span aria-hidden="true" className="inline-flex h-10 w-10" />
                        </div>
                      </div>

                      <motion.div
                        animate="show"
                        className="w-full"
                        initial="hidden"
                        variants={{
                          hidden: {},
                          show: {
                            transition: {
                              staggerChildren: 0.05,
                              delayChildren: 0.06,
                            },
                          },
                        }}
                      >
                        <div className="grid grid-cols-2 gap-x-3 gap-y-3 pb-6">
                          {navTiles.map((tile) => {
                            const isHostels = tile.id === "hostels";
                            const spanClass = tile.colSpan === 2 ? "col-span-2" : "col-span-1";
                            const minHeightClass = "min-h-[132px]";

                            const content = (
                              <>
                                <div className="flex items-start justify-between">
                                  <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", tile.iconBgClass)}>
                                    <Image alt={tile.title} className="h-6 w-6 object-contain" height={24} src={tile.icon} width={24} />
                                  </span>

                                  {tile.badgeNew ? (
                                    <span className="inline-flex rounded-[12px] bg-white px-2 py-1 text-[10px] text-[#ff2e62]" style={navFontStyles.badgeCaps}>
                                      {tile.badgeNew}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="mt-2.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className={cn("text-[22px] leading-8", tile.titleClass)} style={navFontStyles.tileTitle}>
                                      {tile.title}
                                    </span>
                                    {isHostels ? (
                                      <Image
                                        alt="expand"
                                        className={cn("h-4 w-4 shrink-0 object-contain transition-transform duration-300", hostelsExpanded && "rotate-180")}
                                        height={16}
                                        src={navIcons.chevron}
                                        width={16}
                                      />
                                    ) : null}
                                  </div>
                                  <p className={cn("text-[14px] leading-5", tile.subtitleClass)} style={navFontStyles.tileSubtitle}>
                                    {tile.subtitle}
                                  </p>
                                </div>
                              </>
                            );

                            return (
                              <motion.div
                                key={tile.id}
                                className={cn(spanClass, tile.rotationClass)}
                                variants={{ hidden: { opacity: 0, scale: 0.92, y: 18 }, show: { opacity: 1, scale: 1, y: 0 } }}
                              >
                                <div className={cn("relative rounded-[4px] p-1 shadow-lg", tile.bgClass)}>
                                  <div className={cn("relative rounded-[2px] px-[15px] pb-[15px] pt-[15px]", tile.overlayClass, tile.borderClass, minHeightClass)}>
                                    {isHostels ? (
                                      <button
                                        className="flex h-full w-full cursor-pointer flex-col items-start justify-between text-left"
                                        onClick={() => setHostelsExpanded((value) => !value)}
                                        type="button"
                                      >
                                        {content}
                                      </button>
                                    ) : tile.external ? (
                                      <a
                                        className="flex h-full w-full cursor-pointer flex-col items-start justify-between text-left"
                                        href={tile.href}
                                        onClick={closeMenu}
                                        rel="noreferrer"
                                        target="_blank"
                                      >
                                        {content}
                                      </a>
                                    ) : (
                                      <Link
                                        className="flex h-full w-full cursor-pointer flex-col items-start justify-between text-left"
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
                                      </Link>
                                    )}

                                    {isHostels ? (
                                      <AnimatePresence>
                                        {hostelsExpanded ? (
                                          <motion.div
                                            animate={{ height: "auto", opacity: 1 }}
                                            className="overflow-hidden"
                                            exit={{ height: 0, opacity: 0 }}
                                            initial={{ height: 0, opacity: 0 }}
                                          >
                                            <div className="pb-1 pt-3">
                                              <div className="mb-3 h-px w-full bg-white/25" />
                                              <div className="flex flex-col gap-2">
                                                {hostelProperties.map((property) => (
                                                  <Link
                                                    key={property.id}
                                                    href={resolveHostelHref(property.href, property.id)}
                                                    className="text-[15px] text-white/92 transition hover:text-white"
                                                    onClick={closeMenu}
                                                    style={navFontStyles.tileSubtitle}
                                                  >
                                                    • {property.label}
                                                  </Link>
                                                ))}
                                              </div>
                                            </div>
                                          </motion.div>
                                        ) : null}
                                      </AnimatePresence>
                                    ) : null}
                                  </div>

                                  {isHostels && tile.stickerLabel && tile.stickerBg ? (
                                    <div className="absolute -right-[8px] -top-[14px] z-10">
                                      <StickerTag
                                        bg={tile.stickerBg}
                                        className="rounded-[4px] border border-black/10 px-2.5 py-1 text-[10px] font-bold not-italic uppercase tracking-[0.08em] shadow-md"
                                        label={tile.stickerLabel}
                                        rotate={tile.stickerRotate ?? "rotate-[8deg]"}
                                        text={tile.stickerText ?? "#230f14"}
                                      />
                                    </div>
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
