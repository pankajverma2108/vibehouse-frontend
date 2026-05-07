"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";
import { CalendarDays, ChevronDown, LoaderCircle, MapPin, RefreshCcw, Ticket } from "lucide-react";
import { toast } from "sonner";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { GuestVerificationBanner } from "@/components/auth/guest-verification-banner";
import { BookingPageShell } from "@/components/booking/booking-shell";
import { StickerTag } from "@/components/shared/sticker-tag";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { propertyHero } from "@/content/rooms";
import { getGuestBookings, type GuestBookingMineItem } from "@/lib/booking-api";
import { toBrandCheckinLink, withBrandName } from "@/lib/branding";
import { getClientCache, setClientCache } from "@/lib/client-cache";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { toBookingSyncMessage } from "@/lib/ui-error";

const BOOKINGS_CACHE_TTL_MS = 1000 * 60 * 3;

type BookingTabKey = "upcoming" | "active" | "past";

type GuestProfileBookingSummary = {
  ezee_reservation_id: string;
  role: "PRIMARY" | "SECONDARY";
  status: "APPROVED" | "PENDING_APPROVAL" | "REJECTED";
  checkin_date: string;
  checkout_date: string;
  room_type_name: string;
  property_id: string;
};

const BOOKING_TAB_ORDER: BookingTabKey[] = ["upcoming", "active", "past"];

const BOOKING_TAB_LABELS: Record<BookingTabKey, string> = {
  upcoming: "Upcoming",
  active: "Active",
  past: "Past",
};

function bookingsCacheKey(guestId?: string): string | null {
  if (!guestId) {
    return null;
  }

  return `vh:guest-bookings:${guestId}`;
}

function parseBookingTimestamp(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`).getTime();
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

function formatPosterDate(value?: string | null): string {
  const timestamp = parseBookingTimestamp(value);
  if (timestamp === null) {
    return "TBA";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
  }).format(new Date(timestamp)).toUpperCase();
}

function getBookingTabKey(booking: GuestBookingMineItem): BookingTabKey {
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const nowTimestamp = now.getTime();
  const checkInTimestamp = parseBookingTimestamp(booking.checkin_date);
  const checkOutTimestamp = parseBookingTimestamp(booking.checkout_date);
  const normalizedStatus = (booking.status || "").toUpperCase();

  if (normalizedStatus === "CANCELLED" || normalizedStatus === "CHECKED_OUT" || normalizedStatus === "COMPLETED") {
    return "past";
  }

  if (checkInTimestamp !== null && nowTimestamp < checkInTimestamp) {
    return "upcoming";
  }

  if (checkOutTimestamp !== null && nowTimestamp <= checkOutTimestamp) {
    return "active";
  }

  return "past";
}

function compareBookingsForTab(left: GuestBookingMineItem, right: GuestBookingMineItem, tab: BookingTabKey): number {
  const leftCheckIn = parseBookingTimestamp(left.checkin_date) ?? Number.POSITIVE_INFINITY;
  const rightCheckIn = parseBookingTimestamp(right.checkin_date) ?? Number.POSITIVE_INFINITY;
  const leftCheckOut = parseBookingTimestamp(left.checkout_date) ?? Number.NEGATIVE_INFINITY;
  const rightCheckOut = parseBookingTimestamp(right.checkout_date) ?? Number.NEGATIVE_INFINITY;

  if (tab === "upcoming") {
    return leftCheckIn - rightCheckIn;
  }

  if (tab === "active") {
    return leftCheckOut - rightCheckOut;
  }

  return rightCheckOut - leftCheckOut;
}

function buildBookingSections(bookings: GuestBookingMineItem[]): Record<BookingTabKey, GuestBookingMineItem[]> {
  const sections: Record<BookingTabKey, GuestBookingMineItem[]> = {
    upcoming: [],
    active: [],
    past: [],
  };

  for (const booking of bookings) {
    sections[getBookingTabKey(booking)].push(booking);
  }

  for (const tab of BOOKING_TAB_ORDER) {
    sections[tab].sort((left, right) => compareBookingsForTab(left, right, tab));
  }

  return sections;
}

function bookingCardHref(booking: GuestBookingMineItem): string {
  if (getBookingTabKey(booking) === "past") {
    return "/bookings";
  }

  const totalSlots = Math.max(booking.total_slots ?? 1, 1);
  const completedSlots = booking.kyc_completed_slots ?? 0;

  if (completedSlots >= totalSlots) {
    return `/bookings/${encodeURIComponent(booking.ezee_reservation_id)}/confirmed`;
  }

  return toBrandCheckinLink(booking.ezee_reservation_id);
}

function normalizeFallbackBooking(booking: GuestProfileBookingSummary): GuestBookingMineItem {
  return {
    ezee_reservation_id: booking.ezee_reservation_id,
    role: booking.role,
    status: booking.status,
    room_type_name: booking.room_type_name,
    checkin_date: booking.checkin_date,
    checkout_date: booking.checkout_date,
    property_id: booking.property_id,
  };
}

function BookingListSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-white/12 bg-[#0a0a0e] p-4">
          <Skeleton className="h-3 w-20 bg-white/10" />
          <Skeleton className="mt-3 h-4 w-36 bg-white/10" />
          <Skeleton className="mt-5 h-12 w-full rounded-lg bg-white/10" />
          <Skeleton className="mt-3 h-12 w-full rounded-lg bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function BookingNoDataCard() {
  return (
    <div className="px-2 py-10 text-center">
      <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/72">
        <Ticket className="h-3.5 w-3.5 text-[var(--vh-pink)]" />
        No tickets in this view
      </p>
      <h3 className="mt-3 font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-white sm:text-[30px]">Nothing to show right now</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-white/70">
        <Link className="font-semibold text-white underline decoration-[var(--vh-pink)] underline-offset-4 transition-colors hover:text-[var(--vh-pink)]" href={getDefaultPropertyDestinationHref()}>
          Start a new booking
        </Link>
      </p>
    </div>
  );
}

function toNoonTimestamp(value: Date): number {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  return date.getTime();
}

function formatRangeDate(value?: Date): string {
  if (!value) {
    return "Select dates";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
  }).format(value);
}

function formatDateFilterLabel(range: DateRange | undefined): string {
  if (!range?.from) {
    return "Select dates";
  }

  if (!range.to) {
    return formatRangeDate(range.from);
  }

  return `${formatRangeDate(range.from)} - ${formatRangeDate(range.to)}`;
}

function resolveNextRange(current: DateRange | undefined, nextValue: DateRange | undefined, selectedDay?: Date): DateRange | undefined {
  if (!selectedDay) {
    return nextValue;
  }

  if (current?.from && current?.to) {
    return {
      from: selectedDay,
      to: undefined,
    };
  }

  return nextValue;
}

function bookingMatchesDateRange(booking: GuestBookingMineItem, range: DateRange | undefined): boolean {
  if (!range?.from) {
    return true;
  }

  const bookingStart = parseBookingTimestamp(booking.checkin_date);
  const bookingEnd = parseBookingTimestamp(booking.checkout_date) ?? bookingStart;

  if (bookingStart === null && bookingEnd === null) {
    return false;
  }

  const rangeStart = toNoonTimestamp(range.from);
  const rangeEnd = toNoonTimestamp(range.to ?? range.from);
  const normalizedBookingStart = bookingStart ?? bookingEnd ?? Number.NEGATIVE_INFINITY;
  const normalizedBookingEnd = bookingEnd ?? bookingStart ?? Number.POSITIVE_INFINITY;

  return normalizedBookingStart <= rangeEnd && normalizedBookingEnd >= rangeStart;
}

function AutoSyncedBookingCard({ booking, tab }: { booking: GuestBookingMineItem; tab: BookingTabKey }) {
  const statusLabel = tab === "past" ? "Past stay" : tab === "upcoming" ? "Upcoming" : "You're in";
  const propertyLabel = withBrandName(booking.property_id);
  const destinationHref = bookingCardHref(booking);

  return (
    <article className="relative mx-auto w-full max-w-[340px] pt-5 sm:max-w-none sm:pt-6">
      <Link
        aria-label={`Open booking ${booking.ezee_reservation_id}`}
        className="group block focus-visible:outline-none"
        href={destinationHref}
      >
        <div className="absolute right-2 top-0 z-10 rounded-[11px] border-2 border-[var(--vh-surface-2)] bg-[var(--vh-pink)] px-4 py-1.5 shadow-[0_8px_16px_rgba(0,0,0,0.25)] md:rotate-[10deg] md:px-5 md:py-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white">{statusLabel}</p>
        </div>

        <div className="rounded-[16px] border-2 border-[var(--vh-border)] bg-[var(--vh-ice)] p-4 text-[var(--vh-surface-2)] shadow-[8px_8px_0_0_var(--vh-pink)] transition-transform duration-300 sm:p-6 md:-rotate-1 md:hover:-translate-y-1 md:hover:-rotate-2 md:group-hover:-translate-y-1 md:group-hover:-rotate-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--vh-surface)]/70">Confirmation Receipt</p>
            <p className="mt-2 break-all font-['Geologica'] text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--vh-surface)]/55">
              Reservation {booking.ezee_reservation_id}
            </p>
            <div className="mt-2 font-['Space_Grotesk'] text-[36px] font-black leading-[0.92] text-[var(--vh-surface)] sm:text-[44px]">
              <p>{formatPosterDate(booking.checkin_date)}</p>
              <p>{formatPosterDate(booking.checkout_date)}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[12px] bg-[var(--vh-surface)] px-4 py-4 text-white sm:mt-6 sm:px-5">
            <p className="mt-1 text-lg font-bold tracking-tight sm:text-xl">{booking.room_type_name || "Room details pending"}</p>
          </div>

          <div className="mt-4 flex items-start gap-2 text-sm text-[var(--vh-surface)]/80 sm:mt-5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{propertyLabel}</p>
              <p>{propertyHero.address}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 justify-items-center gap-2 sm:mt-5">
            <StickerTag bg="#39ff14" className="px-3 py-1.5 text-[10px] font-bold not-italic uppercase tracking-[0.12em]" label="KYC before chaos" rotate="rotate-[1deg]" text="#0f172a" />
            <StickerTag bg="#00d1ff" className="px-3 py-1.5 text-[10px] font-bold not-italic uppercase tracking-[0.12em]" label="Scan, stay, repeat" rotate="rotate-[-1deg]" text="#0f172a" />
            <div className="col-span-2">
              <StickerTag bg="#fef08a" className="px-3 py-1.5 text-[10px] font-bold not-italic uppercase tracking-[0.12em]" label="Bring the whole gang" rotate="rotate-[-2deg]" text="#0f172a" />
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default function BookingsPage() {
  const { guest, isAuthenticated, isRestoringSession, openAuthModal } = useGuestAuth();
  const searchParams = useSearchParams();
  const [bookingLoadState, setBookingLoadState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [liveBookings, setLiveBookings] = useState<GuestBookingMineItem[]>([]);
  const [liveBookingsOwnerId, setLiveBookingsOwnerId] = useState<string | null>(null);
  const [bookingSyncError, setBookingSyncError] = useState<string | null>(null);
  const [bookingRefreshToken, setBookingRefreshToken] = useState(0);
  const [activeTab, setActiveTab] = useState<BookingTabKey>("upcoming");
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>();
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isDesktopCalendar, setIsDesktopCalendar] = useState(false);
  const freshToastShownRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const sync = (nextMatch: boolean) => setIsDesktopCalendar(nextMatch);

    sync(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => sync(event.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    const freshReservation = searchParams.get("fresh");
    if (!freshReservation || freshToastShownRef.current) {
      return;
    }

    toast.success("Booking confirmed", {
      description: `${freshReservation} is now available in My Bookings.`,
    });
    freshToastShownRef.current = true;
  }, [searchParams]);

  const fallbackBookings = useMemo(
    () => (guest?.bookings ?? []).map<GuestBookingMineItem>((booking) => normalizeFallbackBooking(booking as GuestProfileBookingSummary)),
    [guest?.bookings],
  );

  useEffect(() => {
    if (isRestoringSession || !isAuthenticated || !guest?.id) {
      return;
    }

    const activeGuestId = guest.id;
    const token = getStoredGuestToken();
    if (typeof token !== "string" || token.length === 0) {
      return;
    }
    const authToken = token;

    const cacheKey = bookingsCacheKey(activeGuestId);
    const hasFallbackBookings = (guest.bookings?.length ?? 0) > 0;
    let cancelled = false;

    async function loadBookings() {
      setBookingLoadState("loading");
      setLiveBookingsOwnerId(null);
      setBookingSyncError(null);

      const cachedBookings = cacheKey ? getClientCache<GuestBookingMineItem[]>(cacheKey, BOOKINGS_CACHE_TTL_MS) : null;
      if (cachedBookings && !cancelled) {
        setLiveBookings(cachedBookings);
        setLiveBookingsOwnerId(activeGuestId);
        setBookingLoadState("success");
      }

      try {
        const response = await getGuestBookings(authToken);
        if (!cancelled) {
          setLiveBookings(response);
          setLiveBookingsOwnerId(activeGuestId);
          setBookingLoadState("success");
          if (cacheKey) {
            setClientCache(cacheKey, response);
          }
        }
      } catch (error) {
        if (!cancelled) {
          if (!cachedBookings) {
            setLiveBookings([]);
            setBookingLoadState("error");
            setLiveBookingsOwnerId(null);
          } else {
            setBookingLoadState("success");
          }

          setBookingSyncError(toBookingSyncMessage(error, { hasFallbackData: Boolean(cachedBookings) || hasFallbackBookings }));
        }
      }
    }

    void loadBookings();

    return () => {
      cancelled = true;
    };
  }, [bookingRefreshToken, guest?.bookings?.length, guest?.id, isAuthenticated, isRestoringSession]);

  const refreshBookings = () => {
    setBookingRefreshToken((currentValue) => currentValue + 1);
  };

  const visibleBookings = bookingLoadState === "success" && liveBookingsOwnerId === guest?.id ? liveBookings : fallbackBookings;
  const filteredBookings = useMemo(() => visibleBookings.filter((booking) => bookingMatchesDateRange(booking, dateFilter)), [dateFilter, visibleBookings]);
  const bookingSections = useMemo(() => buildBookingSections(filteredBookings), [filteredBookings]);
  const totalBookingCount = filteredBookings.length;
  const totalAvailableBookingCount = visibleBookings.length;
  const showBookingsSkeleton = bookingLoadState === "loading" && fallbackBookings.length === 0;

  if (isRestoringSession) {
    return (
      <BookingPageShell
        title="Your booking tickets"
        sectionClassName="bg-[#07070a]"
      >
        <div aria-busy="true" aria-live="polite" role="status">
          <span className="sr-only">Loading your reservations and check-in status.</span>
          <BookingListSkeleton />
        </div>
      </BookingPageShell>
    );
  }

  if (!isAuthenticated || !guest) {
    return (
      <BookingPageShell
        title="Sign in to view your bookings"
        description="Bookings are linked to the guest account that completed or linked the reservation."
        sectionClassName="bg-[#07070a]"
      >
        <div className="rounded-[18px] border border-white/12 bg-[var(--vh-panel-strong)] p-6 text-center shadow-[0_20px_45px_rgba(0,0,0,0.35)] sm:p-8">
          <p className="text-lg font-semibold text-white">Guest sign-in required</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/72">
            Use the same guest account used in your booking. Your stays and web check-in progress will appear right away.
          </p>
          <Button className="mt-6 rounded-full bg-[var(--vh-pink)] px-6 text-white hover:bg-[var(--vh-pink-soft)]" onClick={() => openAuthModal("signin")} type="button">
            Sign in to continue
          </Button>
        </div>
      </BookingPageShell>
    );
  }

  return (
    <BookingPageShell
      title="Your booking tickets"
      sectionClassName="bg-[#07070a]"
    >
      <GuestVerificationBanner />
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/12 bg-white/5 p-1">
            {BOOKING_TAB_ORDER.map((tab) => {
              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  className={[
                    "rounded-full px-4 py-2 text-[13px] font-bold uppercase tracking-[0.1em] transition-colors",
                    isActive ? "bg-[var(--vh-pink)] text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {BOOKING_TAB_LABELS[tab]}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Popover onOpenChange={setIsDateFilterOpen} open={isDateFilterOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-left text-white hover:bg-white/10"
                  type="button"
                >
                  <CalendarDays className="h-4 w-4 text-[var(--vh-cyan)]" />
                  <span className="text-sm font-semibold">{formatDateFilterLabel(dateFilter)}</span>
                  <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${isDateFilterOpen ? "rotate-180" : ""}`} />
                </button>
              </PopoverTrigger>

              <PopoverContent
                align="end"
                className={[
                  "z-[200] w-auto border-white/10 bg-[var(--vh-panel-strong)] p-3",
                  isDesktopCalendar ? "max-w-[min(100vw-2rem,860px)]" : "max-w-[min(100vw-2rem,420px)]",
                ].join(" ")}
              >
                <Calendar
                  className="vh-calendar-dark vh-calendar-balanced rounded-[22px]"
                  defaultMonth={dateFilter?.from}
                  mode="range"
                  numberOfMonths={isDesktopCalendar ? 2 : 1}
                  onSelect={(nextValue, selectedDay) => {
                    const resolvedRange = resolveNextRange(dateFilter, nextValue, selectedDay);

                    if (!resolvedRange?.from) {
                      setDateFilter(undefined);
                      return;
                    }

                    setDateFilter(resolvedRange);

                    if (resolvedRange.to) {
                      setIsDateFilterOpen(false);
                    }
                  }}
                  selected={dateFilter}
                />

                <div className="mt-2 flex justify-end">
                  <Button
                    className="h-9 rounded-full border-white/15 bg-transparent text-white/80 hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      setDateFilter(undefined);
                      setIsDateFilterOpen(false);
                    }}
                    type="button"
                    variant="outline"
                  >
                    Clear dates
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              variant="outline"
              className="rounded-full border-white/15 bg-white/5 px-3 text-white hover:bg-white/10"
              disabled={bookingLoadState === "loading"}
              onClick={refreshBookings}
              aria-label="Refresh bookings"
            >
              {bookingLoadState === "loading" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-white/65">
          <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1">
            {BOOKING_TAB_LABELS[activeTab]}: {bookingSections[activeTab].length}
          </span>
          {totalAvailableBookingCount !== totalBookingCount ? (
            <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1">
              {totalAvailableBookingCount} total
            </span>
          ) : null}
          {dateFilter?.from ? (
            <button
              className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              onClick={() => setDateFilter(undefined)}
              type="button"
            >
              Clear date filter
            </button>
          ) : null}
        </div>

        {bookingSyncError ? (
          <p className="rounded-lg border border-amber-200/20 bg-amber-500/10 px-3 py-2 text-xs leading-6 text-amber-100">
            {bookingSyncError}
          </p>
        ) : null}

        {/* Reserved for future "Missing a stay?" manual sync flow. */}

        {showBookingsSkeleton ? (
          <BookingListSkeleton />
        ) : totalBookingCount === 0 || bookingSections[activeTab].length === 0 ? (
          <BookingNoDataCard />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">{BOOKING_TAB_LABELS[activeTab]}</p>
              <span className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white/65">
                {bookingSections[activeTab].length}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {bookingSections[activeTab].map((booking) => (
                <AutoSyncedBookingCard key={`${activeTab}-${booking.ezee_reservation_id}`} booking={booking} tab={activeTab} />
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 text-center">
          <Button asChild className="vh-cta-button">
            <Link href={getDefaultPropertyDestinationHref()}>New Booking</Link>
          </Button>
        </div>
      </section>
    </BookingPageShell>
  );
}
