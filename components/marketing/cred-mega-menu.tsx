"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { siteMeta } from "@/content/site";

export type NavCategory = {
  id: string;
  label: string;
  featured: {
    badge: string;
    title: string;
    subtitle: string;
    image: string;
    href: string;
  };
  cards: {
    title: string;
    description: string;
    image: string;
    href: string;
    requiresAuth?: boolean;
    external?: boolean;
  }[];
};

export const credNavCategories: NavCategory[] = [
  {
    id: "whats-new",
    label: "WHAT'S NEW",
    featured: {
      badge: "NEW LAUNCH",
      title: "VIBEHOUSE · KORAMANGALA",
      subtitle: "Flagship social hostel, private suites & community rooftop cafe",
      image: "/images/property/hero-1-1600.webp",
      href: "/property",
    },
    cards: [
      {
        title: "HOSTEL DORMS",
        description: "high-energy bunk dorms with privacy curtains & lockable storage",
        image: "/images/property/hero-1-768.webp",
        href: "/property",
      },
      {
        title: "BUTEAK SUITES",
        description: "boutique luxury suites with private ensuite balconies in koramangala",
        image: "/images/property/hero-2-768.webp",
        href: "/property",
      },
      {
        title: "ROOFTOP CAFE",
        description: "specialty pour-over coffee, artisanal food & high-speed work desks",
        image: "/images/property/hero-3-768.webp",
        href: "/property",
      },
      {
        title: "LIVE AVAILABILITY",
        description: "real-time inventory engine with instant razorpay confirmation",
        image: "/images/property/hero-4-768.webp",
        href: "/rooms",
      },
    ],
  },
  {
    id: "coliving",
    label: "COLIVING",
    featured: {
      badge: "LONG STAY",
      title: "NOMAD SUITES & MONTHLY FLEX STAYS",
      subtitle: "Zero deposit, 100Mbps dedicated Wi-Fi, daily housekeeping & community",
      image: "/colive/room-main.png",
      href: "/colive",
    },
    cards: [
      {
        title: "KORAMANGALA COLIVE",
        description: "prime startup hub location within walking distance of cafes & gyms",
        image: "/colive/property-koramangala.png",
        href: "/colive",
      },
      {
        title: "INDIRANAGAR COLIVE",
        description: "peaceful residential suite minutes from 100ft road and metro station",
        image: "/colive/property-indiranagar.png",
        href: "/colive",
      },
      {
        title: "ADDON MEAL PLANS",
        description: "custom chef breakfast subscriptions & ergonomic workstation rentals",
        image: "/colive/room-sub.png",
        href: "/colive",
      },
      {
        title: "CALCULATE QUOTE",
        description: "dynamic duration tier savings for 1, 3, and 6-month stay agreements",
        image: "/colive/room-main.png",
        href: "/colive",
      },
    ],
  },
  {
    id: "experiences",
    label: "EXPERIENCES",
    featured: {
      badge: "WEEKLY LINEUP",
      title: "COMMUNITY GIGS, WORKSHOPS & ROOFTOP SESSIONS",
      subtitle: "Curated weekly calendar where travelers, founders and artists connect",
      image: "/images/property/hero-3-1600.webp",
      href: "/events",
    },
    cards: [
      {
        title: "LIVE MUSIC & GIGS",
        description: "intimate rooftop acoustic jam sessions and standup open mics",
        image: "/images/property/hero-2-768.webp",
        href: "/events",
      },
      {
        title: "POTTERY & ART",
        description: "hands-on creative weekend sessions guided by resident makers",
        image: "/images/property/hero-4-768.webp",
        href: "/events",
      },
      {
        title: "GAMES & SOCIALS",
        description: "board game tournaments, trivia leagues & founder mixers",
        image: "/images/property/hero-1-768.webp",
        href: "/events",
      },
      {
        title: "EXPLORE CALENDAR",
        description: "browse all upcoming dates and reserve your guest slot instantly",
        image: "/images/property/hero-3-768.webp",
        href: "/events",
      },
    ],
  },
  {
    id: "guest-hub",
    label: "GUEST HUB",
    featured: {
      badge: "DURING-STAY",
      title: "GUEST SELF-SERVICE, WEB CHECK-IN & REWARDS",
      subtitle: "Instant keyless check-in, breakfast preorder and concierge requests",
      image: "/images/property/hero-4-1600.webp",
      href: "/guest",
    },
    cards: [
      {
        title: "MY BOOKINGS",
        description: "view active and historical stays, room types and download invoices",
        image: "/images/property/hero-1-768.webp",
        href: "/bookings",
        requiresAuth: true,
      },
      {
        title: "WEB CHECK-IN & KYC",
        description: "upload travel documents online for queue-free arrival and room access",
        image: "/images/property/hero-2-768.webp",
        href: "/bookings",
        requiresAuth: true,
      },
      {
        title: "BREAKFAST ORDER",
        description: "pre-select chef breakfast combos and delivery time slots",
        image: "/images/property/hero-3-768.webp",
        href: "/breakfast/preview",
      },
      {
        title: "PROFILE SETTINGS",
        description: "manage verified phone credentials, identity details and preferences",
        image: "/images/property/hero-4-768.webp",
        href: "/profile",
        requiresAuth: true,
      },
    ],
  },
  {
    id: "company",
    label: "COMPANY",
    featured: {
      badge: "VIBEHOUSE",
      title: "CRAFTED FOR NOMADS, TRAVELERS & CREATIVES",
      subtitle: "Redefining boutique social living across India's most vibrant neighborhoods",
      image: "/images/property/hero-2-1600.webp",
      href: "/about",
    },
    cards: [
      {
        title: "ABOUT US",
        description: "our vision, architectural philosophy and community values",
        image: "/images/property/hero-1-768.webp",
        href: "/about",
      },
      {
        title: "INVEST & PARTNER",
        description: "franchise opportunities, property leasing and co-development",
        image: "/images/property/hero-2-768.webp",
        href: "/partner-with-us",
      },
      {
        title: "CONTACT US",
        description: "reach our operations desk for group bookings and partnerships",
        image: "/images/property/hero-3-768.webp",
        href: siteMeta.contact.emailHref,
        external: true,
      },
      {
        title: "HOUSE POLICIES",
        description: "cancellation terms, check-in guidelines and community rules",
        image: "/images/property/hero-4-768.webp",
        href: "/policies",
      },
    ],
  },
];

import { VibehouseLogo } from "./vibehouse-logo";

/**
 * Vibehouse Brand Logo (Original Initial Logo)
 */
export function CredBrandLogo({ className }: { className?: string }) {
  return <VibehouseLogo className={className} />;
}

/**
 * CRED-style Header Expand Trigger Box
 */
export function CredExpandTrigger({
  onClick,
  isOpen,
  className,
}: {
  onClick: () => void;
  isOpen: boolean;
  className?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-expanded={isOpen}
      aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      type="button"
      className={cn(
        "group inline-flex h-[44px] items-center border border-white/20 bg-black/60 px-3.5 backdrop-blur-md transition-all duration-200 hover:border-white/50 cursor-pointer select-none",
        className
      )}
    >
      <div className="hidden sm:flex items-center gap-2.5 pr-3 overflow-hidden">
        {isHovered ? (
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white font-['Gilroy',sans-serif] transition-all">
            <ChevronDown className="h-3.5 w-3.5" />
            CLICK TO EXPAND
          </span>
        ) : (
          <span className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-white/60 font-['Gilroy',sans-serif] transition-all">
            VIBEHOUSE · KORAMANGALA
          </span>
        )}
      </div>

      <div className="hidden sm:block h-4 w-px bg-white/20 mr-3" />

      {/* 3-line hamburger */}
      <div className="flex flex-col justify-between w-4 h-3 text-white">
        <span className="h-[2px] w-full bg-white transition-all group-hover:bg-[var(--vh-pink)]" />
        <span className="h-[2px] w-full bg-white transition-all group-hover:bg-[var(--vh-pink)]" />
        <span className="h-[2px] w-full bg-white transition-all group-hover:bg-[var(--vh-pink)]" />
      </div>
    </button>
  );
}

/**
 * Full CRED Mega Menu Overlay
 */
export function CredMegaMenuOverlay({
  isOpen,
  onClose,
  isAuthenticated,
  onOpenSignIn,
}: {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onOpenSignIn: () => void;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const [activeCategory, setActiveCategory] = useState("whats-new");

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  const activeCategoryData = credNavCategories.find((c) => c.id === activeCategory) || credNavCategories[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.05 : 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-black text-white"
        >
          {/* Top Header Bar with Logo and Close Box */}
          <div className="w-full border-b border-white/10 px-6 sm:px-12 py-6 flex items-center justify-between">
            <CredBrandLogo />

            <button
              onClick={onClose}
              aria-label="Close navigation"
              type="button"
              className="inline-flex h-[44px] w-[44px] items-center justify-center border border-white/20 bg-black/60 text-white hover:border-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" strokeWidth={2.4} />
            </button>
          </div>

          {/* Main Navigation Container */}
          <div className="flex-1 w-full max-w-[1500px] mx-auto px-6 sm:px-12 py-8 flex flex-col">
            {/* Desktop Layout */}
            <div className="hidden lg:grid grid-cols-[280px_1fr] gap-12 flex-1">
              {/* Left Rail: Categories */}
              <div className="flex flex-col border-r border-white/10 pr-6">
                {credNavCategories.map((category) => {
                  const isActive = activeCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      onMouseEnter={() => setActiveCategory(category.id)}
                      type="button"
                      className={cn(
                        "relative w-full h-[64px] text-left px-5 flex items-center border-b border-white/10 transition-colors font-['Gilroy',sans-serif] text-[13px] font-black uppercase tracking-[0.18em]",
                        isActive ? "text-white" : "text-white/45 hover:text-white/80"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="credCategorySpotlight"
                          className="absolute inset-0 bg-gradient-to-r from-white/[0.14] via-white/[0.04] to-transparent pointer-events-none"
                          transition={{ type: "spring", stiffness: 350, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">{category.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Showcase: Featured Banner + 4-Column Cards */}
              <div className="flex flex-col justify-start">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategoryData.id}
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col gap-6"
                  >
                    {/* Featured Top Banner */}
                    <Link
                      href={activeCategoryData.featured.href}
                      onClick={onClose}
                      className="group relative block w-full h-[200px] border border-white/15 overflow-hidden bg-[#121212]"
                    >
                      <Image
                        src={activeCategoryData.featured.image}
                        alt={activeCategoryData.featured.title}
                        fill
                        className="object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      
                      <div className="absolute left-6 top-6">
                        <span className="border border-white/30 bg-black/90 px-3 py-1 text-[9.5px] font-black uppercase tracking-[0.16em] text-white">
                          {activeCategoryData.featured.badge}
                        </span>
                      </div>

                      <div className="absolute left-6 bottom-6 right-6">
                        <h3 className="text-lg sm:text-xl font-extrabold uppercase tracking-[0.1em] text-white font-['Gilroy',sans-serif]">
                          {activeCategoryData.featured.title}
                        </h3>
                        <p className="text-xs text-white/65 uppercase tracking-[0.05em] mt-1 font-['Gilroy',sans-serif]">
                          {activeCategoryData.featured.subtitle}
                        </p>
                      </div>
                    </Link>

                    {/* 4-Column Showcase Row */}
                    <div className="grid grid-cols-4 gap-4">
                      {activeCategoryData.cards.map((card) => (
                        <Link
                          key={card.title}
                          href={card.href}
                          onClick={(e) => {
                            if (card.requiresAuth && !isAuthenticated) {
                              e.preventDefault();
                              onClose();
                              onOpenSignIn();
                              return;
                            }
                            onClose();
                          }}
                          className="group flex flex-col border border-white/10 bg-[#121212] p-3.5 hover:border-white/40 transition-all shadow-[2px_2px_0px_#000000]"
                        >
                          <div className="relative w-full h-[120px] overflow-hidden border border-white/10 bg-black">
                            <Image
                              src={card.image}
                              alt={card.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                            />
                          </div>
                          <h4 className="mt-3 text-[12px] font-extrabold uppercase tracking-[0.14em] text-white font-['Gilroy',sans-serif] group-hover:text-[var(--vh-pink)] transition-colors">
                            {card.title}
                          </h4>
                          <p className="mt-1 text-[11px] text-white/50 lowercase leading-relaxed line-clamp-2">
                            {card.description}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Mobile / Tablet Layout */}
            <div className="flex flex-col lg:hidden gap-6">
              {/* Category Pills Slider */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
                {credNavCategories.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      type="button"
                      className={cn(
                        "whitespace-nowrap px-4 py-2 border text-[11px] font-black uppercase tracking-[0.12em] transition-all",
                        isActive
                          ? "border-white bg-white text-black"
                          : "border-white/20 text-white/60 hover:text-white"
                      )}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Active Category Content */}
              <div className="flex flex-col gap-4">
                <Link
                  href={activeCategoryData.featured.href}
                  onClick={onClose}
                  className="relative block w-full h-[160px] border border-white/15 overflow-hidden bg-[#121212]"
                >
                  <Image
                    src={activeCategoryData.featured.image}
                    alt={activeCategoryData.featured.title}
                    fill
                    className="object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute left-4 top-4">
                    <span className="border border-white/30 bg-black/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                      {activeCategoryData.featured.badge}
                    </span>
                  </div>
                  <div className="absolute left-4 bottom-4 right-4">
                    <h3 className="text-base font-extrabold uppercase tracking-[0.08em] text-white font-['Gilroy',sans-serif]">
                      {activeCategoryData.featured.title}
                    </h3>
                  </div>
                </Link>

                <div className="grid grid-cols-2 gap-3 pb-8">
                  {activeCategoryData.cards.map((card) => (
                    <Link
                      key={card.title}
                      href={card.href}
                      onClick={(e) => {
                        if (card.requiresAuth && !isAuthenticated) {
                          e.preventDefault();
                          onClose();
                          onOpenSignIn();
                          return;
                        }
                        onClose();
                      }}
                      className="flex flex-col border border-white/10 bg-[#121212] p-3 shadow-[2px_2px_0px_#000000]"
                    >
                      <div className="relative w-full h-[85px] overflow-hidden border border-white/10 bg-black">
                        <Image src={card.image} alt={card.title} fill className="object-cover opacity-80" />
                      </div>
                      <h4 className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white font-['Gilroy',sans-serif]">
                        {card.title}
                      </h4>
                      <p className="mt-0.5 text-[10px] text-white/50 lowercase line-clamp-1">
                        {card.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
