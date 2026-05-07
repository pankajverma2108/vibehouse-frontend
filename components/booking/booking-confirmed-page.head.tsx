"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { locationMap, propertyGallery, propertyGuidelines } from "@/content/rooms";
import { linkGuestBooking, type BookingSlotSummary, type LinkGuestBookingResponse } from "@/lib/booking-api";
import { withBrandName, toBrandCheckinLink } from "@/lib/branding";
import { getConfirmedBookingSnapshot } from "@/lib/booking-session";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { toSafeErrorMessage } from "@/lib/ui-error";

import { BookingEmptyState, BookingPageShell, formatCurrency, formatDateLabel, getNightCount } from "./booking-shell";

const EMPTY_SLOTS: BookingSlotSummary[] = [];

function slotStatusTone(status: string): string {
  if (status === "PRE_VERIFIED" || status === "VERIFIED") {
    return "border-[rgba(5,223,114,0.35)] bg-[rgba(5,223,114,0.12)] text-[#05DF72]";
  }

  if (status === "PENDING") {
    return "border-[rgba(241,88,36,0.3)] bg-[rgba(241,88,36,0.1)] text-[#F15824]";
  }

  if (status === "REJECTED") {
    return "border-[rgba(255,106,95,0.3)] bg-[rgba(255,106,95,0.1)] text-[#ff6a5f]";
  }

  return "border-white/15 bg-white/5 text-white/70";
}

function toStatusLabel(status?: string): string {
  if (!status) {
    return "Pending";
  }
  return status.replaceAll("_", " ");
}

export function BookingConfirmedPage({ ezeeReservationId }: { ezeeReservationId: string }) {
  const { isAuthenticated, isRestoringSession, openAuthModal } = useGuestAuth();
  const [bookingDetail, setBookingDetail] = useState<LinkGuestBookingResponse | null>(null);
  const [snapshotFallback, setSnapshotFallback] = useState(() => getConfirmedBookingSnapshot(ezeeReservationId));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isRestoringSession) {
      return;
    }

    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const token = getStoredGuestToken();
    if (typeof token !== "string" || token.length === 0) {
      setIsLoading(false);
      return;
    }
    const authToken = token;

    let cancelled = false;

    async function loadConfirmation() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await linkGuestBooking(authToken, ezeeReservationId);
        if (!cancelled) {
          setBookingDetail(response);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(toSafeErrorMessage(error, "Unable to load this confirmation right now."));
        }
      } finally {
        if (!cancelled) {
          setSnapshotFallback(getConfirmedBookingSnapshot(ezeeReservationId));
          setIsLoading(false);
        }
      }
    }

    void loadConfirmation();

    return () => {
      cancelled = true;
    };
  }, [ezeeReservationId, isAuthenticated, isRestoringSession]);

  const slots = bookingDetail?.slots ?? EMPTY_SLOTS;
  const booking = bookingDetail?.booking;

  const propertyName = withBrandName(snapshotFallback?.propertyName ?? booking?.property_id ?? locationMap.title);
  const checkinDate = booking?.checkin_date ?? snapshotFallback?.checkinDate;
  const checkoutDate = booking?.checkout_date ?? snapshotFallback?.checkoutDate;
  const totalGuests = slots.length || booking?.no_of_guests || snapshotFallback?.totalGuests || 1;
  const roomSummary = booking?.room_type_name ?? snapshotFallback?.roomSummary ?? snapshotFallback?.roomTypeName ?? "Room details pending";

  const checkinLink = toBrandCheckinLink(ezeeReservationId);
  const absoluteCheckinLink = typeof window !== "undefined" ? `${window.location.origin}${checkinLink}` : checkinLink;

  const whatsappMessage = useMemo(
    () =>
      `Our ${propertyName} stay is confirmed. Please finish your web check-in before arrival so we can skip the front-desk delay.\n\n${absoluteCheckinLink}`,
    [absoluteCheckinLink, propertyName],
  );

  const whatsappHref = useMemo(
    () => `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`,
    [whatsappMessage],
  );

  const guests = useMemo(() => {
    if (slots.length > 0) {
      return slots;
    }

    return [
      {
        slot_id: "primary",
        slot_number: 1,
        label: "Primary guest",
        guest_id: null,
        guest_name: snapshotFallback?.primaryGuest
          ? `${snapshotFallback.primaryGuest.firstName} ${snapshotFallback.primaryGuest.lastName}`.trim()
          : "Guest",
        kyc_status: "PENDING",
      } satisfies BookingSlotSummary,
    ];
  }, [slots, snapshotFallback?.primaryGuest]);

  if (isRestoringSession || isLoading) {
    return (
      <BookingPageShell
        badge="Stay Confirmed"
        title="Stay confirmation"
      >
        <div aria-busy="true" aria-live="polite" className="space-y-6" role="status">
          <span className="sr-only">Loading booking confirmation details.</span>

          <div className="rounded-[16px] border border-white/10 bg-[#1A1A1A] px-6 py-7 text-center">
            <Skeleton className="mx-auto h-8 w-64 bg-white/10" />
            <Skeleton className="mx-auto mt-4 h-9 w-40 rounded-full bg-white/10" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
            <div className="space-y-6">
              <div className="rounded-[16px] border border-white/10 bg-[#1A1A1A] p-5 md:p-6">
                <Skeleton className="h-6 w-44 bg-white/10" />
                <Skeleton className="mt-4 h-4 w-full max-w-[420px] bg-white/10" />
                <div className="mt-5 space-y-3">
                  <Skeleton className="h-11 w-full rounded-[10px] bg-white/10" />
                  <Skeleton className="h-11 w-full rounded-[10px] bg-white/10" />
                  <Skeleton className="h-11 w-full rounded-[10px] bg-white/10" />
                </div>
              </div>

              <div className="rounded-[16px] border border-white/10 bg-[#1A1A1A] p-5 md:p-6">
                <Skeleton className="h-5 w-40 bg-white/10" />
                <Skeleton className="mt-4 h-24 w-full rounded-[10px] bg-white/10" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[16px] border border-white/10 bg-[#1A1A1A] p-5">
                <Skeleton className="h-4 w-24 bg-white/10" />
                <Skeleton className="mt-3 h-9 w-full rounded-[10px] bg-white/10" />
                <Skeleton className="mt-3 h-9 w-full rounded-[10px] bg-white/10" />
              </div>

              <div className="rounded-[16px] border border-white/10 bg-[#1A1A1A] p-5">
                <Skeleton className="h-4 w-24 bg-white/10" />
                <Skeleton className="mt-3 h-16 w-full rounded-[10px] bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </BookingPageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <BookingPageShell
        badge="Stay Confirmed"
        title="Sign in to view confirmation"
        description="This screen is available for the guest account linked to this booking."
      >
        <div className="rounded-[16px] border border-white/12 bg-[#1A1A1A] p-8 text-center shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
          <p className="text-lg font-semibold text-white">Guest sign-in required</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#99A1AF]">
            Sign in with your booking account to open your confirmation and co-guest sharing tools.
          </p>
          <Button className="mt-6 rounded-[10px] bg-[#F15824] px-6 text-white hover:bg-[#f36d40]" onClick={() => openAuthModal("signin")} type="button">
            Sign in to continue
          </Button>
        </div>
      </BookingPageShell>
    );
  }

  if (!bookingDetail && !snapshotFallback) {
    return (
      <BookingPageShell
        badge="Stay Confirmed"
        title="Confirmation unavailable"
        description="We could not open a recent confirmation snapshot for this booking."
      >
        <BookingEmptyState
          title="No confirmation found"
          description={errorMessage || "Please reopen your booking details and try again."}
          ctaHref="/bookings"
          ctaLabel="Open my bookings"
        />
      </BookingPageShell>
    );
  }

  return (
    <section className="min-h-screen bg-[#07070a] pb-12 pt-24 animate-vh-fade-in md:pt-28">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="space-y-6">
          <header className="text-center">
            <h1 className="vh-title text-center text-[26px] leading-[1.12] text-white md:text-[30px]">
              Zo Zo Zo! Your stay at <br />
              <span className="text-[#F15824]">{propertyName}</span> is confirmed
            </h1>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[rgba(0,201,80,0.3)] bg-[rgba(0,201,80,0.1)] px-4 py-2 text-[#05DF72]">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-[0.08em]">Stay Confirmed</span>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
            <div className="space-y-6">
              <section className="rounded-[16px] border border-white/5 bg-[#1A1A1A] p-5 md:p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#F15824]" />
                  <h2 className="text-[20px] font-bold text-white">Add Co-guests</h2>
                </div>

                <p className="mt-2 text-sm text-[#99A1AF]">
                  Share this link with your co-guests so they can complete their check-in before arrival.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="rounded-[10px] border border-white/10 bg-[#212121] px-4 py-3 font-mono text-xs text-[#D1D5DC] break-all">
                    {absoluteCheckinLink}
                  </div>
                  <Button
                    className="h-full rounded-[10px] bg-[#F15824] px-4 text-white hover:bg-[#f36d40]"
                    onClick={() => {
                      void navigator.clipboard.writeText(absoluteCheckinLink);
                      toast.success("Link copied", {
                        description: "Share it with your co-guests.",
                      });
                    }}
                    type="button"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Share Link
                  </Button>
                </div>

                <div className="mt-3">
                  <Button asChild className="rounded-[10px] border border-white/15 bg-transparent text-white hover:bg-white/10" variant="outline">
                    <a href={whatsappHref} rel="noreferrer" target="_blank">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Share on WhatsApp
                    </a>
                  </Button>
                </div>

                <div className="mt-5 space-y-3">
                  {guests.map((slot, index) => {
                    const verified = slot.kyc_status === "PRE_VERIFIED" || slot.kyc_status === "VERIFIED";
                    const initials =
                      slot.guest_name
                        ?.split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase() || "NA";

                    return (
                      <div
                        key={slot.slot_id}
                        className={[
                          "rounded-[14px] border bg-[#212121] p-4",
                          verified ? "border-[rgba(0,201,80,0.35)]" : "border-white/10",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                              {verified ? initials : <Users className="h-4 w-4 text-[#6A7282]" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{slot.guest_name || "Not Added"}</p>
                              <div className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${slotStatusTone(slot.kyc_status)}`}>
                                {verified ? "Check-in Done" : toStatusLabel(slot.kyc_status)}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[4px] bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6A7282]">
                            Guest {slot.slot_number || index + 1}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[16px] border border-white/5 bg-[#1A1A1A] p-5 md:p-6">
                <h2 className="text-[20px] font-bold text-white">Booking Info</h2>

                <Accordion className="mt-4" collapsible type="single">
                  <AccordionItem className="rounded-[12px] border border-white/10 bg-[#212121] px-4 mb-3" value="room-info">
                    <AccordionTrigger className="hover:text-[#F15824]">Room Info</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm text-[#D1D5DC]">
                        <p className="font-semibold text-white">{roomSummary}</p>
                        <p>Check-in: {formatDateLabel(checkinDate)} ({propertyGuidelines.checkIn})</p>
                        <p>Check-out: {formatDateLabel(checkoutDate)} ({propertyGuidelines.checkOut})</p>
                        <p>Guests: {totalGuests}</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem className="rounded-[12px] border border-white/10 bg-[#212121] px-4 mb-3" value="payment-info">
                    <AccordionTrigger className="hover:text-[#F15824]">Payment Info</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm text-[#D1D5DC]">
                        <p>Amount paid: <span className="font-semibold text-white">{formatCurrency(snapshotFallback?.amountPaid ?? 0)}</span></p>
                        <p>Status: <span className="font-semibold text-white">{toStatusLabel(booking?.status ?? snapshotFallback?.status)}</span></p>
                        {snapshotFallback?.paymentId ? (
                          <p>Payment reference: <span className="font-semibold text-white break-all">{snapshotFallback.paymentId}</span></p>
                        ) : null}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem className="rounded-[12px] border border-white/10 bg-[#212121] px-4 mb-3" value="how-to-reach">
                    <AccordionTrigger className="hover:text-[#F15824]">How to Reach</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm text-[#D1D5DC]">
                        <p>{locationMap.address}</p>
                        <a className="inline-flex items-center gap-2 text-[#F15824] hover:text-[#f36d40]" href={locationMap.embedUrl} rel="noreferrer" target="_blank">
                          Open on maps
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem className="rounded-[12px] border border-white/10 bg-[#212121] px-4 mb-3" value="cancellation-policy">
                    <AccordionTrigger className="hover:text-[#F15824]">Cancellation Policy</AccordionTrigger>
                    <AccordionContent>
                      Free cancellation windows depend on your booking type. Refer to your booking details for exact policy terms.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem className="rounded-[12px] border border-white/10 bg-[#212121] px-4" value="property-policy">
                    <AccordionTrigger className="hover:text-[#F15824]">Property Policy</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2 text-sm text-[#D1D5DC]">
                        {propertyGuidelines.summary.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="overflow-hidden rounded-[16px] border border-white/5 bg-[#1A1A1A]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={propertyName}
                  className="h-[180px] w-full object-cover"
                  src={propertyGallery[0]?.src || "/images/property/hero-1.jpg"}
                />
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white">{propertyName}</h3>
                  <p className="mt-1 text-sm text-[#99A1AF]">{locationMap.address}</p>

                  <div className="mt-4 grid gap-2">
                    <Button asChild className="rounded-[10px] border border-white/15 bg-transparent text-white hover:bg-white/10" variant="outline">
                      <a href={locationMap.embedUrl} rel="noreferrer" target="_blank">
                        <MapPin className="mr-2 h-4 w-4" />
                        Open Maps
                      </a>
                    </Button>
                    <Button className="rounded-[10px] border border-white/15 bg-transparent text-white hover:bg-white/10" type="button" variant="outline">
                      <Phone className="mr-2 h-4 w-4" />
                      Contact Front Desk
                    </Button>
                  </div>
                </div>
              </section>

              <section className="rounded-[16px] border border-white/5 bg-[#1A1A1A] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#99A1AF]">Stay Summary</p>
                <div className="mt-3 space-y-2 text-sm text-[#D1D5DC]">
                  <div className="flex items-center justify-between">
                    <span>Nights</span>
                    <span className="font-semibold text-white">{getNightCount(checkinDate, checkoutDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <span className="font-semibold text-white">{toStatusLabel(booking?.status ?? snapshotFallback?.status)}</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  <Button asChild className="rounded-[10px] bg-[#F15824] text-white hover:bg-[#f36d40]">
                    <Link href="/bookings">My Bookings</Link>
                  </Button>
                  <Button asChild className="rounded-[10px] border border-white/15 bg-transparent text-white hover:bg-white/10" variant="outline">
                    <Link href={checkinLink}>Open Web Check-In</Link>
                  </Button>
                </div>
              </section>
            </aside>
          </div>

          {errorMessage ? (
            <div className="rounded-[12px] border border-[rgba(255,106,95,0.35)] bg-[rgba(255,106,95,0.1)] px-4 py-3 text-sm text-[#ffd9d4]">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
