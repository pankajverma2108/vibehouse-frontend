"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ConciergeBell,
  HelpCircle,
  KeyRound,
  PackageSearch,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingBag,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { BentoCard } from "@/components/guest/bento-card";
import { SectionBlock } from "@/components/guest/section-block";
import { guestStickerTags } from "@/components/guest/guest-sticker-tags";
import { StickerTag } from "@/components/shared/sticker-tag";
import { Button } from "@/components/ui/button";
import { MOTION_DISTANCE, MOTION_DURATION, MOTION_SCALE, MOTION_STAGGER } from "@/lib/motion";
import { getGuestPropertyLocation } from "@/content/guest-properties";
import { nearbyAttractions, propertyGallery, propertyGuidelines } from "@/content/rooms";
import { siteMeta } from "@/content/site";
import { useGuestCatalog } from "@/hooks/use-guest-catalog";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { getGuestBookings, requestService, type GuestDashboardBooking } from "@/lib/guest-experience-api";
import { useGuestExperience } from "@/state/guest-experience-provider";

type QuickAction = {
  title: string;
  copy: string;
  href: string;
  icon: typeof ConciergeBell;
  sticker: string;
};

const quickActions: QuickAction[] = [
  {
    title: "Concierge",
    copy: "Ask for housekeeping, support, or a front-desk handoff.",
    href: "services",
    icon: ConciergeBell,
    sticker: "Recommended",
  },
  {
    title: "Add-Ons",
    copy: "Rent essentials, add comforts, and review stay upgrades.",
    href: "addons",
    icon: ShoppingBag,
    sticker: "Popular",
  },
  {
    title: "Stay Guide",
    copy: "Rules, neighborhood picks, FAQs, and arrival details.",
    href: "guide",
    icon: Waypoints,
    sticker: "Included",
  },
  {
    title: "Checkout",
    copy: "Review paid extras and settle anything pending.",
    href: "checkout",
    icon: ReceiptText,
    sticker: "Available Today",
  },
];

const supportPhoneDigits = siteMeta.contact.phoneDisplay.replace(/\D/g, "");

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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M19.11 4.93A10 10 0 0 0 12 2a9.95 9.95 0 0 0-8.38 15.34L3 22l4.82-1.48A10 10 0 1 0 19.11 4.93ZM12 20.1a8.04 8.04 0 0 1-4.09-1.12l-.29-.17-2.86.88.93-2.77-.19-.3A8.05 8.05 0 1 1 12 20.1Zm4.23-5.9c-.23-.11-1.34-.66-1.55-.74-.21-.08-.36-.11-.52.11-.15.23-.6.74-.73.9-.13.15-.27.17-.5.06-.23-.12-.96-.35-1.83-1.12-.67-.6-1.13-1.34-1.26-1.57-.13-.23-.01-.35.1-.47.1-.1.23-.27.34-.4.11-.13.15-.23.23-.38.08-.16.04-.29-.02-.4-.06-.11-.53-1.27-.72-1.74-.19-.46-.38-.4-.52-.4h-.44c-.16 0-.4.06-.61.29-.21.23-.8.78-.8 1.9s.82 2.19.93 2.34c.11.15 1.6 2.44 3.88 3.42.54.23.96.37 1.29.47.54.17 1.03.15 1.42.09.43-.07 1.34-.55 1.53-1.08.19-.53.19-.98.13-1.08-.06-.1-.21-.17-.44-.28Z"
        fill="currentColor"
      />
    </svg>
  );
}

function isLostFoundService(service: { id: string; name: string; code?: string }) {
  const normalized = `${service.code ?? ""} ${service.id} ${service.name}`.toLowerCase();
  return normalized.includes("lost") || normalized.includes("found");
}

function StayMetric({ icon: Icon, label, value, detail }: { icon: typeof CalendarDays; label: string; value: string; detail?: string }) {
  return (
    <article className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-white/10 bg-black/20 text-[#f9cb37]">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase text-white/52">{label}</p>
          <p className="mt-1 truncate text-base font-black text-white">{value}</p>
          {detail ? <p className="mt-0.5 truncate text-xs text-white/55">{detail}</p> : null}
        </div>
      </div>
    </article>
  );
}

function getQuickActionSticker(sticker: string) {
  if (sticker === "Popular") {
    return { bg: "#f2c84b", text: "#111111", rotate: "rotate-[1deg]" as const };
  }
  if (sticker === "Included") {
    return { bg: "#3a5f84", text: "#ffffff", rotate: "rotate-[-1deg]" as const };
  }
  if (sticker === "Available Today") {
    return { bg: "#2f7e61", text: "#ffffff", rotate: "rotate-[1deg]" as const };
  }
  return { bg: "#f9cb37", text: "#111111", rotate: "rotate-[-2deg]" as const };
}

function QuickActionCard({ action, href }: { action: QuickAction; href: string }) {
  const Icon = action.icon;
  const sticker = getQuickActionSticker(action.sticker);
  const cardId = `stay-console-card-${action.title.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <DocumentLink
      className="group relative flex min-h-[190px] flex-col justify-between overflow-hidden rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-1 hover:border-[var(--vh-pink)]/60"
      href={href}
      id={cardId}
    >
      <div className="flex items-start justify-between gap-4">
        <StickerTag
          bg={sticker.bg}
          className="px-3 py-1.5 text-[10px] font-black not-italic uppercase"
          label={action.sticker}
          rotate={sticker.rotate}
          text={sticker.text}
        />
        <span className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-[var(--vh-pink)]/30 bg-[rgba(198,40,40,0.14)] text-white">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div>
        <h3 className="font-sectiontitle text-[22px] leading-7 text-white">{action.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#cbd5e1]">{action.copy}</p>
        <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase text-white">
          Open
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </DocumentLink>
  );
}

function HeroStayCard({ booking }: { booking: GuestDashboardBooking | null }) {
  const propertyName = booking?.property_name ?? "The Daily Social";

  return (
    <article className="relative overflow-hidden rounded-[8px] border border-dashed border-white/24 bg-[#07070a] shadow-[0_24px_60px_rgba(0,0,0,0.32)]" id="home-hero-stay-card">
      <div className="relative min-h-[440px]">
        <Image
          alt="The Daily Social guest room"
          className="h-full min-h-[440px] w-full object-cover"
          height={820}
          priority
          src={propertyGallery[0]?.src ?? "/images/property/hero-1-1600.webp"}
          width={980}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,10,0.18)_0%,rgba(7,7,10,0.84)_74%,#07070a_100%)]" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
        <StickerTag bg={guestStickerTags.dashboard.bg} className="px-3 py-1.5 text-[11px] font-bold uppercase" label={titleCaseStatus(booking?.status)} rotate={guestStickerTags.dashboard.rotate} text={guestStickerTags.dashboard.text} />
        <h1 className="mt-4 max-w-xl font-sectiontitle text-[34px] leading-tight text-white md:text-[48px]">Welcome home for now.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/76 md:text-base">
          {propertyName} is set for your stay. Keep access, services, extras, and house guidance in one place.
        </p>
      </div>
    </article>
  );
}

export function GuestDashboard() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { guest, isAuthenticated, openAuthModal } = useGuestAuth();
  const { selectedBookingId, getGuestRouteHref } = useGuestExperience();
  const [bookingFallback, setBookingFallback] = useState<GuestDashboardBooking | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [lostFoundSubmitting, setLostFoundSubmitting] = useState(false);
  const [lostFoundMessage, setLostFoundMessage] = useState<string | null>(null);
  const [lostFoundActionError, setLostFoundActionError] = useState<string | null>(null);

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
  const propertyId = activeBooking?.property_id ?? "";
  const propertyLocation = useMemo(() => getGuestPropertyLocation(activeBooking?.property_id), [activeBooking?.property_id]);
  const { data: catalogData, loading: catalogLoading, error: catalogError, reload: reloadCatalog } = useGuestCatalog(propertyId, Boolean(propertyId && selectedBookingId && isAuthenticated));
  const lostFoundService = useMemo(() => {
    const services = Array.isArray(catalogData.services) ? catalogData.services : [];
    return services.find(isLostFoundService) ?? null;
  }, [catalogData.services]);

  const displayBookingError = bookingFromAuth ? null : bookingError;
  const stayWindow = `${formatDate(activeBooking?.checkin_date)} - ${formatDate(activeBooking?.checkout_date)}`;
  const roomOrBed = formatRoomOrBed(activeBooking?.room_number);
  const accessValue = activeBooking?.door_passcode ?? "Shared at check-in";
  const supportHref = `https://wa.me/${supportPhoneDigits}?text=${encodeURIComponent(`Hey The Daily Social, I need help with booking ${activeBooking?.ezee_reservation_id ?? selectedBookingId ?? ""}.`)}`;
  const primaryCtaClass = "vh-cta-button h-10 rounded-[4px] px-4 text-xs";

  useEffect(() => {
    if (!rootRef.current || typeof window === "undefined") {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        "[data-guest-reveal]",
        { y: MOTION_DISTANCE.xl, opacity: 0, scale: MOTION_SCALE.subtleEnter },
        { y: 0, opacity: 1, scale: 1, duration: MOTION_DURATION.slow, stagger: MOTION_STAGGER.standard, ease: "power3.out" },
      );
    }, rootRef);

    return () => {
      context.revert();
    };
  }, [activeBooking?.ezee_reservation_id]);

  const onSubmitLostFound = async () => {
    if (!selectedBookingId) {
      toast.error("No active booking found.");
      return;
    }
    if (!isAuthenticated) {
      openAuthModal("signin");
      return;
    }
    if (!lostFoundService) {
      toast.message("The care desk is not open for this stay right now.");
      return;
    }

    const token = getStoredGuestToken();
    if (!token) {
      openAuthModal("signin");
      return;
    }

    setLostFoundSubmitting(true);
    setLostFoundMessage(null);
    setLostFoundActionError(null);
    try {
      const response = await requestService(selectedBookingId, { product_id: lostFoundService.id }, token);
      setLostFoundMessage(`${response.service_name} submitted. Ticket: ${response.ticket_id}`);
      toast.success(response.message);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to submit request.";
      setLostFoundActionError("Something went wrong while submitting the request.");
      toast.error(message);
    } finally {
      setLostFoundSubmitting(false);
    }
  };

  return (
    <div ref={rootRef} className="space-y-10 pb-10 md:space-y-12 md:pb-12">
      {/* SECTION: Home Hero */}
      <section className="grid items-stretch gap-5 pt-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]" data-guest-reveal id="home-hero-section">
        <HeroStayCard booking={activeBooking} />
        <aside className="flex flex-col gap-4">
          <StayMetric icon={BadgeCheck} label="Room / Bed" value={roomOrBed} />
          <StayMetric detail={formatLockStatus(activeBooking?.lock_status)} icon={KeyRound} label="Door Access" value={accessValue} />
          <StayMetric detail={titleCaseStatus(activeBooking?.status)} icon={CalendarDays} label="Stay Window" value={stayWindow} />
          <div className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5" id="home-support-card">
            <p className="text-[11px] font-black uppercase text-[#f9cb37]">Need a human?</p>
            <h2 className="mt-2 font-sectiontitle text-[24px] leading-8 text-white">The desk can help before the small thing becomes a whole thing.</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className={primaryCtaClass}>
                <a href={supportHref} rel="noreferrer" target="_blank">
                  <WhatsAppIcon className="mr-2 h-4 w-4" />
                  WhatsApp support
                </a>
              </Button>
              <Button asChild className="vh-cta-button h-10 rounded-[4px] bg-white px-4 text-xs text-[#07070a] hover:bg-white/90" variant="secondary">
                <DocumentLink href={getGuestRouteHref("services")}>Open services</DocumentLink>
              </Button>
            </div>
          </div>
        </aside>
      </section>

      {bookingLoading ? <p className="text-xs font-bold uppercase text-[#94a3b8]">Loading booking details...</p> : null}
      {displayBookingError ? <p className="text-xs font-bold uppercase text-rose-300">{displayBookingError}</p> : null}

      {/* SECTION: Stay Console */}
      <SectionBlock description="The fastest paths for the things guests usually need during a stay." sticker={guestStickerTags.shell} title="Your Stay Console">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-guest-reveal>
          {quickActions.map((action) => (
            <QuickActionCard action={action} href={getGuestRouteHref(getGuestSubpath(action.href))} key={action.title} />
          ))}
        </div>
      </SectionBlock>

      {/* SECTION: Lost And Found */}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]" data-guest-reveal id="lost-found">
        <div className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 md:p-6" id="lost-found-main-card">
          <StickerTag bg={guestStickerTags.lostFound.bg} className="px-3 py-1.5 text-[11px] font-bold uppercase" label="Lost & Found" rotate={guestStickerTags.lostFound.rotate} text={guestStickerTags.lostFound.text} />
          <h2 className="mt-4 font-sectiontitle text-[28px] leading-tight text-white md:text-[36px]">Left something behind?</h2>
          <p className="mt-3 text-sm leading-7 text-[#cbd5e1]">
            Raise a care-desk ticket from here. The property team can track it against this stay and follow up with the useful details.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button className={primaryCtaClass} disabled={!lostFoundService} loading={lostFoundSubmitting} loadingText="Submitting ticket" onClick={() => void onSubmitLostFound()} type="button">
              {!lostFoundSubmitting ? <Search className="mr-2 h-4 w-4" /> : null}
              Report item
            </Button>
            {catalogError ? (
              <Button className="vh-cta-button h-10 rounded-[4px] bg-white px-4 text-xs text-[#07070a] hover:bg-white/90" onClick={() => void reloadCatalog()} type="button" variant="secondary">
                Retry desk
              </Button>
            ) : null}
          </div>
          {catalogLoading ? <p className="mt-4 text-sm text-white/60">Checking care desk availability...</p> : null}
          {!catalogLoading && !lostFoundService ? <p className="mt-4 text-sm text-white/60">Care-desk tickets are not open for this stay right now.</p> : null}
          {lostFoundMessage ? <p className="mt-4 text-sm text-emerald-300">{lostFoundMessage}</p> : null}
          {lostFoundActionError ? <p className="mt-4 text-sm text-rose-300">{lostFoundActionError}</p> : null}
          {catalogError ? <p className="mt-4 text-sm text-rose-300">{catalogError}</p> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <BentoCard description="Use your stay name, room, and booking reference when the team follows up." icon={PackageSearch} sticker={{ label: "Recommended", bg: "#f9cb37", text: "#111111", rotate: "rotate-[-2deg]" }} title="Describe the item" />
          <BentoCard description="Found items stay with property operations until the team confirms ownership and handover." icon={ShieldCheck} sticker={{ label: "Included", bg: "#3a5f84", text: "#ffffff", rotate: "rotate-[1deg]" }} title="Desk verification" />
          <article className="sm:col-span-2 rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 md:p-6" id="lost-found-support-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-[var(--vh-pink)]/30 bg-[rgba(198,40,40,0.14)] text-[#f9cb37]">
                <HelpCircle className="h-5 w-5" />
              </div>
              <Button asChild className="vh-cta-button h-9 rounded-[4px] bg-white px-4 text-[11px] text-[#07070a] hover:bg-white/90">
                <a href={supportHref} rel="noreferrer" target="_blank">Message support</a>
              </Button>
            </div>
            <h3 className="mt-4 font-sectiontitle text-[24px] leading-8 text-white">Need faster help?</h3>
            <p className="mt-2 text-sm leading-6 text-[#cbd5e1]">For urgent valuables, contact support too so the desk can prioritize the search.</p>
          </article>
        </div>
      </section>

      {/* SECTION: Property Highlights */}
      <SectionBlock action={<Button asChild className="vh-cta-button h-10 rounded-[4px] px-5 text-xs"><a href={propertyLocation.mapsHref} rel="noreferrer" target="_blank">Open in Maps</a></Button>} sticker={guestStickerTags.notice} title="Property Highlights">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]" data-guest-reveal>
          <article className="overflow-hidden rounded-[8px] border border-dashed border-white/24 bg-[#07070a]">
            <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase text-[#f9cb37]">{propertyLocation.neighborhoodLabel}</p>
                <h3 className="mt-1 font-sectiontitle text-xl text-white">{propertyLocation.title}</h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#cbd5e1]">{propertyLocation.address}</p>
              </div>
            </div>
            <iframe
              className="h-[260px] w-full md:h-[310px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={propertyLocation.embedUrl}
              title={propertyLocation.title}
            />
          </article>
          <div className="space-y-4">
            {nearbyAttractions.slice(0, 3).map((place) => (
              <article className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-4" key={place.name}>
                <h3 className="mt-2 font-sectiontitle text-xl text-white">{place.name}</h3>
                <p className="mt-1 text-sm text-[#cbd5e1]">{place.type} - {place.travel}</p>
              </article>
            ))}
            <article className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-4">
              <p className="text-[11px] font-black uppercase text-white/52">House rhythm</p>
              <p className="mt-2 text-sm leading-6 text-[#cbd5e1]">
                Check-in starts at {propertyGuidelines.checkIn}. Check-out is by {propertyGuidelines.checkOut}. Keep a valid ID ready at the desk.
              </p>
            </article>
          </div>
        </div>
      </SectionBlock>
      {/* SECTION: Checkout Summary */}
      <section className="rounded-[8px] border border-dashed border-white/24 bg-[#07070a] p-5 md:p-6" data-guest-reveal id="checkout-summary-section">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase text-[#f9cb37]">Before checkout</p>
            <h2 className="mt-2 font-sectiontitle text-[26px] leading-tight text-white">Checkout summary</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#cbd5e1]">Review add-ons, rentals, and totals in one place before you close out the stay.</p>
          </div>
          <Button asChild className="vh-cta-button h-10 rounded-[4px] bg-white px-5 text-xs text-[#07070a] hover:bg-white/90">
            <DocumentLink href={getGuestRouteHref("checkout")}>
              <KeyRound className="mr-2 h-4 w-4" />
              Checkout summary
            </DocumentLink>
          </Button>
        </div>
      </section>
    </div>
  );
}
import { DocumentLink } from "@/components/static-export/document-link";
