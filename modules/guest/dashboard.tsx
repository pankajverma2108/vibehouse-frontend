"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, KeyRound, ShieldCheck, UserPlus, Waypoints } from "lucide-react";
import { toast } from "sonner";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { BentoCard } from "@/components/guest/bento-card";
import { SectionBlock } from "@/components/guest/section-block";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { StickerTag } from "@/components/shared/sticker-tag";
import { Button } from "@/components/ui/button";
import { getGuestPropertyLocation } from "@/content/guest-properties";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { getGuestBookings, type GuestDashboardBooking } from "@/lib/guest-experience-api";
import { cn } from "@/lib/utils";
import { useGuestExperience } from "@/state/guest-experience-provider";

type ActionCard = {
  title: string;
  href: string;
  icon: string;
  featured?: boolean;
  subtitle?: string;
  sticker?: (typeof guestStickerTags)["extend"];
};

type GearCard = {
  title: string;
  price: string;
  href: string;
  icon: string;
  featured?: boolean;
};

const actionCards: ActionCard[] = [
  {
    title: "Extend Stay",
    href: "/guest/extend",
    icon: "/guest-dashboard/icons/Icon-13.svg",
    featured: true,
    sticker: guestStickerTags.extend,
  },
  {
    title: "Buy Add-ons",
    href: "/guest/addons",
    icon: "/guest-dashboard/icons/Icon-7.svg",
    subtitle: "Snacks, extras, and handy comforts",
  },
  {
    title: "Request Service",
    href: "/guest/services",
    icon: "/guest-dashboard/icons/Icon-5.svg",
    subtitle: "Housekeeping, help, and quick support",
  },
] as const;

const gearCards: GearCard[] = [
  {
    title: "Fresh Towels",
    price: "Ready to request",
    href: "/guest/addons",
    icon: "/guest-dashboard/icons/Icon-12.svg",
    featured: true,
  },
  {
    title: "Adapter Kit",
    price: "Keep every device charged",
    href: "/guest/borrow",
    icon: "/guest-dashboard/icons/Icon-4.svg",
  },
  {
    title: "Hair Dryer",
    price: "Quick borrow from the desk",
    href: "/guest/borrow",
    icon: "/guest-dashboard/icons/Icon-3.svg",
  },
  {
    title: "Laundry Refresh",
    price: "Sort the essentials in minutes",
    href: "/guest/services",
    icon: "/guest-dashboard/icons/Icon-8.svg",
  },
] as const;

const stayFlexCards = [
  {
    title: "Late Checkout",
    subtitle: "Keep the room a little longer when the day allows it.",
    price: "Till 2:00 PM",
    href: "/guest/extend",
    cta: "Book now",
  },
  {
    title: "One More Night",
    subtitle: "Still settling in? Add another night without leaving the flow.",
    price: "Keep the trip going",
    href: "/guest/extend",
    cta: "See options",
  },
] as const;

const ruleCards = [
  { label: "Network: StreetArt_Hub", icon: "/guest-dashboard/icons/Icon-1.svg" },
  { label: "No smoking inside", icon: "/guest-dashboard/icons/Icon.svg" },
  { label: "Quiet hours after 10 PM", icon: "/guest-dashboard/icons/Icon-6.svg" },
] as const;

function getGuestSubpath(href: string) {
  return href.replace(/^\/guest\/?/, "");
}

function formatDate(value?: string | null) {
  if (!value) {
    return "TBA";
  }

  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "TBA";
  }

  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function titleCaseStatus(value?: string | null) {
  if (!value || value === "APPROVED") {
    return "Confirmed";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatRoomOrBed(roomNumber?: string | null) {
  return roomNumber?.trim() ? roomNumber.trim().toUpperCase() : "Assigned at check-in";
}

function formatLockStatus(value?: string | null) {
  if (!value) {
    return "Shared at check-in";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function GuestIcon({ alt, className, src, size = 24 }: { alt: string; className?: string; src: string; size?: number }) {
  return <Image alt={alt} className={cn("object-contain", className)} height={size} src={src} width={size} />;
}

function PolaroidRoomCard({ booking, guideHref }: { booking: GuestDashboardBooking | null; guideHref: string }) {
  const roomOrBed = formatRoomOrBed(booking?.room_number);
  const roomType = booking?.room_type_name ?? "Your room details will appear here.";
  const stayUntil = booking?.checkout_date ? `Until ${formatDate(booking.checkout_date)}` : "Checkout date pending";
  const propertyName = booking?.property_name ?? "Your stay";

  return (
    <article className="relative mx-auto w-full max-w-[360px] rotate-[-2deg] bg-white p-3 pb-9 text-[#0f172a] shadow-[0_16px_32px_rgba(0,0,0,0.38)] md:max-w-[430px] lg:mx-0">
      <div className="relative h-[280px] overflow-hidden bg-[#e2e8f0] md:h-[340px]">
        <Image alt="Luxury hotel room" className="h-full w-full object-cover" height={680} priority src="/guest-dashboard/assets/luxury-hotel-room.png" width={760} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#475569]">Room / Bed</p>
          <h2 className="truncate font-['Geologica'] text-[22px] font-black leading-7 tracking-[-0.04em] text-[#0f172a] md:text-[28px]">{roomOrBed}</h2>
          <p className="mt-1 truncate text-sm font-normal leading-5 text-[#0f172a]/70 md:text-base">{roomType}</p>
          <p className="mt-1 truncate text-xs font-medium leading-5 text-[#0f172a]/55">{propertyName}</p>
          <p className="mt-2 text-xs font-black leading-4 text-[var(--vh-pink)] md:text-sm">{stayUntil}</p>
        </div>
        <Link className="group flex shrink-0 flex-col items-end text-[var(--vh-pink)]" href={guideHref}>
          <GuestIcon alt="" className="transition-transform group-hover:translate-x-1" size={32} src="/guest-dashboard/icons/Icon-14.svg" />
          <span className="mt-1 text-right text-[10px] font-black uppercase leading-[15px]">House Guide</span>
        </Link>
      </div>
      <div className="absolute right-3 top-3 md:-right-8 md:-top-7">
        <StickerTag
          bg={guestStickerTags.dashboard.bg}
          className="px-3 py-1.5 text-[11px] font-black not-italic uppercase tracking-[0.12em]"
          label={titleCaseStatus(booking?.status)}
          rotate={guestStickerTags.dashboard.rotate}
          text={guestStickerTags.dashboard.text}
        />
      </div>
    </article>
  );
}

function ActionTile({ card, href }: { card: ActionCard; href: string }) {
  return (
    <Link
      className={cn(
        "group relative flex min-h-[190px] flex-col justify-end overflow-hidden rounded-[8px] border-2 border-[var(--vh-pink)]/45 bg-[#1e293b] p-4 shadow-[0_14px_30px_rgba(0,0,0,0.28)] transition hover:-translate-y-1 hover:border-[var(--vh-pink)] md:min-h-[210px]",
        card.featured && "border-[var(--vh-pink)] bg-[linear-gradient(135deg,#c62828_0%,#8e1b1b_100%)]",
      )}
      href={href}
    >
      {card.sticker ? (
        <div className="absolute left-3 top-3">
          <StickerTag
            bg={card.sticker.bg}
            className="px-3 py-1 text-[10px] font-black not-italic uppercase tracking-[0.12em]"
            label={card.sticker.label}
            rotate={card.sticker.rotate}
            text={card.sticker.text}
          />
        </div>
      ) : null}
      <div className={cn("absolute right-6 top-6 flex h-14 w-14 items-center justify-center rounded-[12px] bg-[#3a0f12]", card.featured && "bg-white/10")}>
        <GuestIcon alt="" className={card.featured ? "opacity-25" : undefined} size={28} src={card.icon} />
      </div>
      {card.subtitle ? <p className={cn("mb-2 max-w-[180px] text-xs font-medium leading-5", card.featured ? "text-white/76" : "text-[#94a3b8]")}>{card.subtitle}</p> : null}
      <h3 className="max-w-[170px] font-['Geologica'] text-[24px] font-black leading-7 tracking-[-0.04em] text-white">{card.title}</h3>
      <ArrowRight className="mt-3 h-6 w-6 text-white transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function GearTile({ item, href }: { item: GearCard; href: string }) {
  return (
    <Link
      className={cn(
        "group relative flex min-h-[160px] flex-col items-center justify-center rounded-[8px] border-4 border-[var(--vh-pink)] bg-[#1e293b] p-4 text-center shadow-[0_16px_32px_rgba(0,0,0,0.28)] transition hover:-translate-y-1 md:min-h-[190px]",
        item.featured && "bg-[linear-gradient(135deg,#c62828_0%,#8e1b1b_100%)]",
      )}
      href={href}
    >
      <GuestIcon alt="" size={32} src={item.icon} />
      <h3 className="mt-4 font-['Geologica'] text-sm font-black uppercase leading-5 text-white md:text-base">{item.title}</h3>
      <p className={cn("mt-1 text-[10px] leading-[15px]", item.featured ? "text-white/80" : "text-[#cbd5e1]")}>{item.price}</p>
      <span className={cn("mt-4 rounded-full px-5 py-1.5 text-xs font-black uppercase", item.featured ? "bg-white text-[var(--vh-pink)]" : "bg-[var(--vh-pink)] text-white")}>
        Open
      </span>
    </Link>
  );
}

function StayFlexTile({ item, href }: { item: (typeof stayFlexCards)[number]; href: string }) {
  return (
    <article className="relative overflow-hidden rounded-[8px] border-2 border-dashed border-[var(--vh-pink)]/60 bg-[#16070c] p-6 shadow-[0_18px_34px_rgba(0,0,0,0.24)]">
      <div className="pointer-events-none absolute -left-10 -top-8 h-28 w-28 rounded-full bg-[var(--vh-pink)]/8" />
      <div className="relative z-10 flex h-full flex-col gap-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--vh-pink)]">Stay Flex</p>
          <h3 className="mt-3 font-['Geologica'] text-[24px] font-black leading-7 text-white">{item.title}</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#cbd5e1]">{item.subtitle}</p>
        </div>
        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base font-black uppercase tracking-[0.08em] text-white">{item.price}</p>
          <Button asChild className="h-10 rounded-[4px] bg-[var(--vh-pink)] px-5 font-black uppercase text-white hover:bg-[var(--vh-pink-soft)]">
            <Link href={href}>{item.cta}</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function GuestDashboard() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { guest, isAuthenticated } = useGuestAuth();
  const { selectedBookingId, getGuestRouteHref } = useGuestExperience();
  const [bookingFallback, setBookingFallback] = useState<GuestDashboardBooking | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const bookingFromAuth = useMemo(() => {
    const candidates = guest?.bookings ?? [];
    if (candidates.length === 0) {
      return null;
    }

    const selected = selectedBookingId
      ? candidates.find((item) => item.ezee_reservation_id === selectedBookingId)
      : candidates.find((item) => item.status === "APPROVED") ?? candidates[0];

    if (!selected) {
      return null;
    }

    return {
      ezee_reservation_id: selected.ezee_reservation_id,
      role: selected.role,
      status: selected.status,
      room_type_name: selected.room_type_name,
      room_number: selected.room_number ?? null,
      checkin_date: selected.checkin_date,
      checkout_date: selected.checkout_date,
      property_id: selected.property_id,
      property_name: selected.property_name ?? null,
      door_passcode: selected.door_passcode ?? null,
      lock_status: selected.lock_status ?? null,
    } satisfies GuestDashboardBooking;
  }, [guest?.bookings, selectedBookingId]);

  useEffect(() => {
    if (bookingFromAuth || !isAuthenticated) {
      return;
    }

    const token = getStoredGuestToken();
    if (!token) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setBookingLoading(true);
        setBookingError(null);
      }
    });

    void getGuestBookings(token)
      .then((bookings) => {
        if (cancelled) {
          return;
        }

        const selected = selectedBookingId
          ? bookings.find((item) => item.ezee_reservation_id === selectedBookingId)
          : bookings.find((item) => item.status === "APPROVED") ?? bookings[0] ?? null;

        setBookingFallback(selected ?? null);
      })
      .catch((error) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unable to load booking details.";
          setBookingError(message);
          setBookingFallback(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBookingLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookingFromAuth, isAuthenticated, selectedBookingId]);

  const activeBooking = bookingFromAuth ?? (isAuthenticated ? bookingFallback : null);
  const displayBookingError = bookingFromAuth ? null : bookingError;
  const propertyLocation = useMemo(() => getGuestPropertyLocation(activeBooking?.property_id), [activeBooking?.property_id]);
  const accessValue = activeBooking?.door_passcode ?? "Shared at check-in";
  const stayWindow = `${formatDate(activeBooking?.checkin_date)} - ${formatDate(activeBooking?.checkout_date)}`;
  const roomOrBed = formatRoomOrBed(activeBooking?.room_number);
  const statusLabel = titleCaseStatus(activeBooking?.status);

  useEffect(() => {
    if (!rootRef.current || typeof window === "undefined") {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const context = gsap.context(() => {
      const hero = rootRef.current?.querySelector("[data-gsap='hero']");
      const sections = rootRef.current?.querySelectorAll("[data-gsap='section']");

      if (hero) {
        gsap.fromTo(hero, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: "power3.out" });
      }

      if (sections && sections.length > 0) {
        gsap.fromTo(sections, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.68, stagger: 0.08, ease: "power3.out", delay: 0.08 });
      }
    }, rootRef);

    return () => {
      context.revert();
    };
  }, [activeBooking?.ezee_reservation_id]);

  return (
    <div ref={rootRef} className="space-y-10 md:space-y-12">
      {/* Hero and guest actions section */}
      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-12" data-gsap="hero">
        <PolaroidRoomCard booking={activeBooking} guideHref={getGuestRouteHref("guide")} />

        <div className="space-y-5 pt-1 lg:pt-8">
          <div className="flex items-center gap-3">
            <GuestIcon alt="" size={20} src="/guest-dashboard/icons/Icon-11.svg" />
            <h2 className="font-['Geologica'] text-[20px] font-black leading-7 tracking-[-0.04em] text-[#f1f5f9]">Guest Actions</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {actionCards.map((card) => (
              <ActionTile card={card} href={getGuestRouteHref(getGuestSubpath(card.href))} key={card.title} />
            ))}
          </div>
        </div>
      </section>

      {/* Stay essentials section */}
      <section className="grid gap-4 md:grid-cols-3" data-gsap="section">
        <article className="rounded-[8px] border border-[var(--vh-pink)]/40 bg-[#16070c] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--vh-pink)]">Stay Window</p>
          <p className="mt-3 text-lg font-black text-white">{stayWindow}</p>
        </article>
        <article className="rounded-[8px] border border-[var(--vh-pink)]/40 bg-[#16070c] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--vh-pink)]">Door Access</p>
          <p className="mt-3 text-lg font-black text-white">{accessValue}</p>
          <p className="mt-1 text-xs font-medium text-[#94a3b8]">{formatLockStatus(activeBooking?.lock_status)}</p>
        </article>
        <article className="rounded-[8px] border border-[var(--vh-pink)]/40 bg-[#16070c] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--vh-pink)]">Room / Bed</p>
          <p className="mt-3 text-lg font-black text-white">{roomOrBed}</p>
          <p className="mt-1 text-xs font-medium text-[#94a3b8]">{statusLabel}</p>
        </article>
      </section>

      {bookingLoading ? <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#94a3b8]">Loading booking details...</p> : null}
      {displayBookingError ? <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-300">{displayBookingError}</p> : null}

      {/* Gear section */}
      <SectionBlock className="mx-auto" title="Grab Your Gear">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-5 lg:grid-cols-3" data-gsap="section">
          {gearCards.map((item, index) => (
            <div className={cn(index === gearCards.length - 1 ? "col-span-2 lg:col-span-3 lg:mx-auto lg:w-full lg:max-w-[320px]" : "")} key={item.title}>
              <GearTile href={getGuestRouteHref(getGuestSubpath(item.href))} item={item} />
            </div>
          ))}
        </div>
      </SectionBlock>

      {/* Stay flexibility section */}
      <SectionBlock description="More time options that feel easy to say yes to." title="Stay On Your Terms">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2" data-gsap="section">
          {stayFlexCards.map((item) => (
            <StayFlexTile href={getGuestRouteHref(getGuestSubpath(item.href))} item={item} key={item.title} />
          ))}
        </div>
      </SectionBlock>

      {/* Rules section */}
      <SectionBlock title="The Rules">
        <article
          className="relative overflow-hidden bg-[linear-gradient(145deg,rgba(198,40,40,0.24)_0%,#230f14_100%)] p-8 shadow-[0_2px_4px_2px_rgba(0,0,0,0.05)_inset] md:p-10"
          data-gsap="section"
          style={{ clipPath: "polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 28px 100%, 0 calc(100% - 28px))" }}
        >
          <div className="space-y-4">
            {ruleCards.map((rule) => (
              <div className="flex items-center gap-4 border-b border-[var(--vh-pink)]/30 pb-3" key={rule.label}>
                <GuestIcon alt="" size={24} src={rule.icon} />
                <p className="text-sm font-bold uppercase leading-5 text-[#f1f5f9]">{rule.label}</p>
              </div>
            ))}
          </div>
          <Button asChild className="mx-auto mt-8 flex h-11 w-full max-w-[260px] rounded-none border-2 border-[var(--vh-pink)] bg-transparent font-black uppercase text-[var(--vh-pink)] hover:bg-[var(--vh-pink)] hover:text-white">
            <Link href={getGuestRouteHref("guide")}>Open House Guide</Link>
          </Button>
        </article>
      </SectionBlock>

      {/* Map section */}
      <SectionBlock action={<Button asChild className="h-10 rounded-[4px] bg-[var(--vh-pink)] px-5 font-black uppercase text-white hover:bg-[var(--vh-pink-soft)]"><a href={propertyLocation.mapsHref} rel="noreferrer" target="_blank">Open in Maps</a></Button>} sticker={guestStickerTags.notice} title="Find The Property">
        <article className="overflow-hidden rounded-[10px] border-4 border-[#334155] bg-[#10131a] shadow-[0_16px_36px_rgba(0,0,0,0.32)]" data-gsap="section">
          <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--vh-pink)]">{propertyLocation.neighborhoodLabel}</p>
              <h3 className="mt-1 font-['Geologica'] text-xl font-black text-white">{propertyLocation.title}</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#cbd5e1]">{propertyLocation.address}</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
              <GuestIcon alt="" size={16} src="/guest-dashboard/icons/Icon-2.svg" />
              Easy arrival pin for this booking
            </div>
          </div>
          <iframe
            className="h-[260px] w-full md:h-[300px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={propertyLocation.embedUrl}
            title={propertyLocation.title}
          />
        </article>
      </SectionBlock>

      {/* Gate access section */}
      <SectionBlock title="Gate Access / Visitors">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3" data-gsap="section">
          <BentoCard description="Share the visitor name ahead of time so the desk can speed up arrival." icon={UserPlus} title="Invite visitor">
            <Button className="h-9 rounded-[4px] bg-[var(--vh-pink)] px-4 font-black uppercase text-white hover:bg-[var(--vh-pink-soft)]" onClick={() => toast.message("Ask the front desk to register your visitor.")} type="button">
              Ask the desk
            </Button>
          </BentoCard>
          <BentoCard description={`Use ${roomOrBed} and your stay name at reception for a smoother entry.`} icon={Waypoints} title="Arrival notes" />
          <BentoCard description="Need to pass entry details to a co-guest? Start from here first." icon={ShieldCheck} title="Share access">
            <Button className="h-9 rounded-[4px] bg-[#1e293b] px-4 font-black uppercase text-white hover:bg-[#334155]" onClick={() => toast.message("Front desk will help confirm co-guest access.")} type="button" variant="secondary">
              Share details
            </Button>
          </BentoCard>
          <div className="col-span-2 xl:col-span-3">
            <BentoCard description="Keep a government ID ready and ask reception before sending anyone up." icon={KeyRound} title="Reception check">
              <p className="text-sm leading-6 text-white/75">Guest access is approved on arrival, and visitor entry follows property rules for the current booking.</p>
            </BentoCard>
          </div>
        </div>
      </SectionBlock>

      {/* Checkout section */}
      <div className="flex justify-start" data-gsap="section">
        <Button asChild className="h-10 rounded-[4px] bg-white px-5 font-black uppercase text-[#07070a] hover:bg-white/90">
          <Link href={getGuestRouteHref("checkout")}>
            <KeyRound className="mr-2 h-4 w-4" />
            Checkout summary
          </Link>
        </Button>
      </div>
    </div>
  );
}
