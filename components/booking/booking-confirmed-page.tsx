"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import gsap from "gsap";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { Button as NeoPopButton } from "@/components/neopop/button";
import { Token } from "@/components/neopop/status";
import { Skeleton } from "@/components/ui/skeleton";
import { locationMap, nearbyAttractions, propertyGuidelines } from "@/content/rooms";
import { siteMeta } from "@/content/site";
import { linkGuestBooking, type LinkGuestBookingResponse } from "@/lib/booking-api";
import { withBrandName, toAbsoluteBrandCheckinLink, toBrandCheckinLink } from "@/lib/branding";
import { getConfirmedBookingSnapshot } from "@/lib/booking-session";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { MOTION_DISTANCE, MOTION_DURATION, MOTION_SCALE, MOTION_STAGGER, getHoverLift } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { toSafeErrorMessage } from "@/lib/ui-error";
import { useDownloadReceipt } from "@/hooks/use-download-receipt";
import { DocumentLink } from "@/components/static-export/document-link";

import { BookingEmptyState, BookingPageShell } from "./booking-shell";

type ConfirmedSnapshot = ReturnType<typeof getConfirmedBookingSnapshot>;

type CancellationMilestone = {
  label: string;
  date: string;
  copy: string;
  tone: "good" | "warn" | "bad" | "checkin";
};

function formatScheduleDate(value?: string | null): string {
  if (!value) {
    return "TBA";
  }

  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "TBA";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(parsed);
}

function offsetDate(value: string | null | undefined, days: number): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setDate(parsed.getDate() - days);
  return parsed;
}

function formatPolicyDate(value: Date | null): string {
  if (!value) {
    return "TBA";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function buildCancellationMilestones(checkinDate?: string | null): CancellationMilestone[] {
  const fiveDaysBefore = offsetDate(checkinDate, 5);
  const twoDaysBefore = offsetDate(checkinDate, 2);
  const checkinDay = offsetDate(checkinDate, 0);

  return [
    {
      label: "Now",
      date: "Right this second",
      copy: "If the plan is still flexible, this is your cleanest window to sort it.",
      tone: "good",
    },
    {
      label: "5 days before arrival",
      date: formatPolicyDate(fiveDaysBefore),
      copy: "Past this point, the refund window follows standard property cancellation rules.",
      tone: "warn",
    },
    {
      label: "48 hours before check-in",
      date: formatPolicyDate(twoDaysBefore),
      copy: "Last sensible stop before the non-refundable period locks in.",
      tone: "bad",
    },
    {
      label: "Check-in day",
      date: formatPolicyDate(checkinDay),
      copy: `Your room expects you at ${propertyGuidelines.checkIn}.`,
      tone: "checkin",
    },
  ];
}

function formatCurrencyValue(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function resolvePaymentBreakdown(snapshot: ConfirmedSnapshot) {
  const rooms = snapshot?.rooms ?? [];
  const addons = snapshot?.addons ?? [];

  const roomTotalFromRows = rooms.reduce((sum, room) => sum + room.lineTotal, 0);
  const addonTotalFromRows = addons.reduce((sum, addon) => sum + addon.lineTotal, 0);

  const subtotalRooms = snapshot?.pricing?.subtotalRooms ?? (roomTotalFromRows > 0 ? roomTotalFromRows : snapshot?.amountPaid ?? 0);
  const subtotalAddons = snapshot?.pricing?.subtotalAddons ?? addonTotalFromRows;
  const totalBeforeTax = subtotalRooms + subtotalAddons;
  const taxes = snapshot?.pricing?.taxes ?? Math.max((snapshot?.pricing?.grandTotal ?? snapshot?.amountPaid ?? totalBeforeTax) - totalBeforeTax, 0);
  const grandTotal = snapshot?.pricing?.grandTotal ?? Math.max(totalBeforeTax + taxes, snapshot?.amountPaid ?? 0);
  const amountPaid = snapshot?.amountPaid ?? grandTotal;
  const amountDue = Math.max(grandTotal - amountPaid, 0);

  return {
    subtotalRooms,
    subtotalAddons,
    taxes,
    grandTotal,
    amountPaid,
    amountDue,
  };
}

function DashedSeparator() {
  return (
    <svg aria-hidden="true" className="h-px w-full shrink-0" height="1">
      <line className="stroke-[#3D3D3D]" strokeDasharray="8, 5" strokeLinecap="round" strokeWidth="1" x1="0" x2="100%" y1="0" y2="0" />
    </svg>
  );
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

export function BookingConfirmedPage({ ezeeReservationId }: { ezeeReservationId: string }) {
  const { isAuthenticated, isRestoringSession, openAuthModal } = useGuestAuth();
  const reducedMotion = useReducedMotion() ?? false;
  const [bookingDetail, setBookingDetail] = useState<LinkGuestBookingResponse | null>(null);
  const [snapshotFallback, setSnapshotFallback] = useState(() => getConfirmedBookingSnapshot(ezeeReservationId));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const tilesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isRestoringSession) {
      return;
    }

    if (!isAuthenticated) {
      queueMicrotask(() => {
        setIsLoading(false);
      });
      return;
    }

    const token = getStoredGuestToken();
    if (typeof token !== "string" || token.length === 0) {
      queueMicrotask(() => {
        setIsLoading(false);
      });
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

  useLayoutEffect(() => {
    if (!tilesRef.current) {
      return;
    }

    if (reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-confirmation-tile]",
        { opacity: 0, y: MOTION_DISTANCE.lg, scale: MOTION_SCALE.subtleEnter },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: MOTION_DURATION.slow,
          ease: "power3.out",
          stagger: MOTION_STAGGER.standard,
        },
      );
    }, tilesRef);

    return () => {
      ctx.revert();
    };
  }, [reducedMotion]);

  const booking = bookingDetail?.booking;
  const propertyName = withBrandName(snapshotFallback?.propertyName ?? booking?.property_id ?? locationMap.title);
  const checkinDate = booking?.checkin_date ?? snapshotFallback?.checkinDate;
  const checkoutDate = booking?.checkout_date ?? snapshotFallback?.checkoutDate;
  const roomSummary = booking?.room_type_name ?? snapshotFallback?.roomSummary ?? snapshotFallback?.roomTypeName ?? "Room details pending";
  const paymentBreakdown = useMemo(() => resolvePaymentBreakdown(snapshotFallback), [snapshotFallback]);
  const cancellationMilestones = useMemo(() => buildCancellationMilestones(checkinDate), [checkinDate]);
  const checkinLink = toBrandCheckinLink(ezeeReservationId);
  const absoluteCheckinLink = toAbsoluteBrandCheckinLink(ezeeReservationId);
  const { downloadReceipt, isGenerating: isReceiptGenerating, error: receiptError } = useDownloadReceipt(ezeeReservationId);
  const supportEmail = siteMeta.contact.email;
  const tileHoverMotion = getHoverLift(reducedMotion, MOTION_DISTANCE.xs);

  const whatsappShareHref = useMemo(() => {
    const message = `Bring your vibe, bring your playlist. ${propertyName} is locked in. Tap this to finish your pre-arrival bits: ${absoluteCheckinLink}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [absoluteCheckinLink, propertyName]);

  const supportWhatsAppHref = useMemo(
    () => `mailto:${supportEmail}?subject=${encodeURIComponent(`Hey ${propertyName}, I need help with booking ${ezeeReservationId}.`)}`,
    [ezeeReservationId, propertyName, supportEmail],
  );

  const cancelRequestHref = useMemo(
    () => `mailto:${supportEmail}?subject=${encodeURIComponent(`Please help me cancel booking ${ezeeReservationId}.`)}`,
    [ezeeReservationId, supportEmail],
  );

  if (isRestoringSession || isLoading) {
    return (
      <BookingPageShell title="Stay Confirmation">
        <div aria-busy="true" aria-live="polite" className="space-y-6" role="status">
          <span className="sr-only">Loading booking confirmation details.</span>
          <div className="rounded-none border border-[#3D3D3D] bg-[#161616] px-6 py-8 text-center shadow-[6px_6px_0px_#000000]">
            <Skeleton className="mx-auto h-8 w-64 bg-white/10 rounded-none" />
            <Skeleton className="mx-auto mt-4 h-9 w-40 bg-white/10 rounded-none" />
          </div>
        </div>
      </BookingPageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <BookingPageShell title="Sign In to View Confirmation" description="This screen is available for the guest account linked to this booking.">
        <div className="rounded-none border border-[#3D3D3D] bg-[#161616] p-8 text-center shadow-[6px_6px_0px_#000000] font-['Gilroy',sans-serif]">
          <h2 className="font-['Cirka',serif] text-2xl text-white tracking-tight">One booking, one verified account.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/70">Sign in with the account that owns the stay. We’ll pull up the confirmation and digital ticket.</p>
          <div className="mt-6 flex justify-center">
            <NeoPopButton variant="primary" onClick={() => openAuthModal("signin")}>
              Sign In to Continue
            </NeoPopButton>
          </div>
        </div>
      </BookingPageShell>
    );
  }

  if (!bookingDetail && !snapshotFallback) {
    return (
      <BookingPageShell title="Confirmation Unavailable" description="We could not open a recent confirmation snapshot for this booking.">
        <BookingEmptyState
          title="No Confirmation Found"
          description={errorMessage || "Please reopen your booking details and try again."}
          ctaHref="/bookings"
          ctaLabel="Open My Bookings"
        />
      </BookingPageShell>
    );
  }

  return (
    <section className="min-h-screen bg-[#0A0A0E] pb-16 pt-24 animate-vh-fade-in md:pt-28 font-['Gilroy',sans-serif] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div ref={tilesRef} className="space-y-7">
          <header className="text-center">
            <div className="flex justify-center mb-3">
              <Token variant="brand" label="RESERVATION CONFIRMED" />
            </div>
            <h1 className="font-['Cirka',serif] text-center text-3xl leading-[1.12] text-white tracking-tight md:text-4xl lg:text-5xl">
              Bags packed. Vibes ready. <br />
              <span className="text-[var(--vh-pink)]">{propertyName}</span> is ready for you.
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/70">
              Stay confirmed. Bring your government ID, keep your phone charged, and complete web check-in before arrival.
            </p>
          </header>

          <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            {/* Share Tile */}
            <motion.article className="lg:col-span-7" initial={false} whileHover={tileHoverMotion} data-confirmation-tile>
              <div className="flex h-full flex-col rounded-none border border-white/15 bg-[#171822] p-6 shadow-[6px_6px_0px_#000000]">
                <div className="space-y-2">
                  <Token variant="brand" label="SHARE PASS" />
                  <h2 className="font-['Cirka',serif] text-2xl text-white tracking-tight">Send the check-in link to co-guests</h2>
                  <p className="max-w-xl text-sm leading-6 text-white/70">Share the pre-arrival link on WhatsApp so the crew can complete their KYC before hitting the door.</p>
                </div>

                <div className="mt-5 flex flex-1 flex-col gap-4 border border-white/10 bg-[#12131A] p-5">
                  <div className="flex items-center gap-3 text-white">
                    {checkinDate ? <CheckCircle2 className="h-5 w-5 text-[var(--np-green)]" /> : <ShieldCheck className="h-5 w-5 text-[var(--vh-pink)]" />}
                    <p className="text-sm font-semibold">{checkinDate ? "Your reservation is confirmed. Co-guests can verify instantly via WhatsApp." : "Tap WhatsApp and share the pre-arrival KYC portal."}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <NeoPopButton variant="primary" asChild>
                      <a href={whatsappShareHref} rel="noreferrer" target="_blank">
                        <WhatsAppIcon className="mr-2 h-4 w-4" />
                        Share on WhatsApp
                      </a>
                    </NeoPopButton>
                    <span className="text-xs text-white/50">Direct verified check-in link</span>
                  </div>

                  <DashedSeparator />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="border border-white/10 bg-[#12131A] p-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/50">Check-in</p>
                      <p className="mt-1 text-sm font-bold text-white">{formatScheduleDate(checkinDate)} · {propertyGuidelines.checkIn}</p>
                    </div>
                    <div className="border border-white/10 bg-[#12131A] p-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/50">Check-out</p>
                      <p className="mt-1 text-sm font-bold text-white">{formatScheduleDate(checkoutDate)} · {propertyGuidelines.checkOut}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.article>

            {/* Stay Timeline Tile */}
            <motion.article className="lg:col-span-5" initial={false} whileHover={tileHoverMotion} data-confirmation-tile>
              <div className="flex h-full flex-col rounded-none border border-white/15 bg-[#171822] p-6 shadow-[6px_6px_0px_#000000]">
                <div className="flex items-center gap-3">
                  <Token variant="brand" label="STAY TIMELINE" />
                </div>

                <div className="mt-4 space-y-4">
                  <h2 className="font-['Cirka',serif] text-2xl text-white tracking-tight">Stay Timeline</h2>

                  <div className="flex items-start gap-3 border border-white/10 bg-[#12131A] p-4">
                    <CalendarDays className="h-5 w-5 text-[var(--vh-pink)] shrink-0 mt-0.5" />
                    <div className="flex flex-1 items-center gap-4 sm:gap-6">
                      <div>
                        <span className="block text-[11px] uppercase tracking-wider text-white/50">Check-in</span>
                        <span className="text-sm font-bold text-white">{formatScheduleDate(checkinDate)}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-white/40" />
                      <div>
                        <span className="block text-[11px] uppercase tracking-wider text-white/50">Check-out</span>
                        <span className="text-sm font-bold text-white">{formatScheduleDate(checkoutDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs leading-6 text-white/70">
                    <p>Show up with a government ID matching the booking name for instant room key issuance.</p>
                    <p>{checkinDate ? "Your dates are locked with backend room inventory." : "Complete pre-arrival KYC anytime before arriving."}</p>
                  </div>
                </div>

                <div className="mt-auto pt-6 text-center">
                  <p className="mx-auto max-w-xs text-xs leading-5 text-white/60">Complete digital KYC before stepping through the door.</p>
                  <div className="mt-4 flex justify-center">
                    <NeoPopButton variant="primary" fullWidth asChild>
                      <DocumentLink href={checkinLink}>
                        Open Pre-Arrival Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </DocumentLink>
                    </NeoPopButton>
                  </div>
                </div>
              </div>
            </motion.article>

            {/* Room Info Tile */}
            <motion.article className="lg:col-span-5" initial={false} whileHover={tileHoverMotion} data-confirmation-tile>
              <div className="h-full rounded-none border border-white/15 bg-[#171822] p-6 shadow-[6px_6px_0px_#000000]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Token variant="blue" label="ACCOMMODATION" />
                    <h2 className="mt-2 font-['Cirka',serif] text-2xl text-white tracking-tight">Room Info</h2>
                  </div>
                  <BadgeCheck className="h-6 w-6 text-[var(--np-green)]" />
                </div>

                <div className="mt-4 space-y-2 text-white/80">
                  <p className="font-['Cirka',serif] text-xl text-white">{roomSummary}</p>
                  <p className="text-xs text-white/60">{propertyName}</p>
                  {snapshotFallback?.roomTypeName && snapshotFallback.roomTypeName !== roomSummary ? (
                    <p className="text-xs text-white/60">{snapshotFallback.roomTypeName}</p>
                  ) : null}
                  {booking?.room_number ? <p className="text-xs font-bold text-[var(--vh-pink)]">Assigned Room: {booking.room_number}</p> : null}
                </div>

                <div className="mt-5 space-y-2.5 border border-white/10 bg-[#12131A] p-4 text-xs">
                  <div className="flex items-center gap-2 text-white/80">
                    <ShieldCheck className="h-4 w-4 text-[var(--vh-pink)] shrink-0" />
                    <span>Valid physical ID document required upon arrival.</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <ShieldCheck className="h-4 w-4 text-[var(--np-green)] shrink-0" />
                    <span>Linen, high-speed WiFi, and housekeeping included.</span>
                  </div>
                </div>

                {/* Download Receipt CTA */}
                <div className="mt-5 pt-4 border-t border-[#3D3D3D]">
                  <NeoPopButton
                    id="download-receipt-btn"
                    variant="secondary"
                    fullWidth
                    loading={isReceiptGenerating}
                    onClick={() => void downloadReceipt()}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isReceiptGenerating ? "Generating Receipt…" : "Download Receipt (PDF)"}
                  </NeoPopButton>
                  {receiptError ? (
                    <p className="mt-2 text-center text-xs leading-5 text-[#EE4D37]">{receiptError}</p>
                  ) : null}
                </div>
              </div>
            </motion.article>

            {/* Payment Breakdown Tile */}
            <motion.article className="lg:col-span-7" initial={false} whileHover={tileHoverMotion} data-confirmation-tile>
              <div className="h-full rounded-none border border-white/15 bg-[#171822] p-6 shadow-[6px_6px_0px_#000000]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Token variant="green" label="PAYMENT RECEIPT" />
                    <h2 className="mt-2 font-['Cirka',serif] text-2xl text-white tracking-tight">Billing Summary</h2>
                  </div>
                  <WalletCards className="h-6 w-6 text-[var(--vh-pink)]" />
                </div>

                <div className="mt-5 space-y-4 font-['Gilroy',sans-serif]">
                  <div className="flex flex-col gap-3 text-xs border border-white/10 bg-[#12131A] p-4">
                    <div className="flex items-center justify-between text-white/70">
                      <span>Room charges</span>
                      <span className="font-mono text-white">{formatCurrencyValue(paymentBreakdown.subtotalRooms)}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/70">
                      <span>Add-on services</span>
                      <span className="font-mono text-white">{formatCurrencyValue(paymentBreakdown.subtotalAddons)}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/70">
                      <span>Taxes & fees</span>
                      <span className="font-mono text-white">{formatCurrencyValue(paymentBreakdown.taxes)}</span>
                    </div>
                    <DashedSeparator />
                    <div className="flex items-center justify-between text-sm font-bold text-white">
                      <span>Grand Total</span>
                      <span className="font-mono text-[var(--vh-pink)]">{formatCurrencyValue(paymentBreakdown.grandTotal)}</span>
                    </div>
                    <DashedSeparator />
                    <div className="flex items-center justify-between text-white/70">
                      <span>Amount Paid</span>
                      <span className="font-mono text-[var(--np-green)]">- {formatCurrencyValue(paymentBreakdown.amountPaid)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>Balance Due at Desk</span>
                      <span className="font-mono text-white">{formatCurrencyValue(paymentBreakdown.amountDue)}</span>
                    </div>
                  </div>

                  <div className="border border-white/10 bg-[#12131A] p-3 text-xs text-white/60">
                    Transparent billing: paid via Razorpay secure gateway. Confirmation token attached to reservation.
                  </div>
                </div>
              </div>
            </motion.article>

            {/* Check-in / Out Guidelines */}
            <motion.article className="lg:col-span-5" initial={false} whileHover={tileHoverMotion} data-confirmation-tile>
              <div className="h-full rounded-none border border-white/15 bg-[#171822] p-6 shadow-[6px_6px_0px_#000000]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Token variant="brand" label="HOUSE RULES" />
                    <h2 className="mt-2 font-['Cirka',serif] text-2xl text-white tracking-tight">Check-In / Out</h2>
                  </div>
                  <CalendarDays className="h-6 w-6 text-[var(--vh-pink)]" />
                </div>

                <div className="mt-5 space-y-4 border border-white/10 bg-[#12131A] p-4 text-xs">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="h-4 w-4 text-[var(--vh-pink)] shrink-0 mt-0.5" />
                    <div className="flex flex-1 items-center justify-between">
                      <div>
                        <span className="block text-[10px] uppercase text-white/50">Check-in</span>
                        <span className="font-bold text-white">{propertyGuidelines.checkIn}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/30" />
                      <div>
                        <span className="block text-[10px] uppercase text-white/50">Check-out</span>
                        <span className="font-bold text-white">{propertyGuidelines.checkOut}</span>
                      </div>
                    </div>
                  </div>

                  <DashedSeparator />

                  <div className="space-y-2.5 text-white/70">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[var(--np-green)] shrink-0" />
                      <span>Physical photo ID required for all guests.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TriangleAlert className="h-3.5 w-3.5 text-[#facc15] shrink-0" />
                      <span>Arriving after 10 PM? Notify host on WhatsApp.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-[var(--vh-pink)] shrink-0" />
                      <span>Quiet hours observed from 11 PM to 8 AM.</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.article>

            {/* How to Reach Tile */}
            <motion.article className="lg:col-span-7" initial={false} whileHover={tileHoverMotion} data-confirmation-tile>
              <div className="h-full rounded-none border border-white/15 bg-[#171822] p-6 shadow-[6px_6px_0px_#000000]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Token variant="blue" label="LOCATION" />
                    <h2 className="mt-2 font-['Cirka',serif] text-2xl text-white tracking-tight">How to Reach</h2>
                  </div>
                  <MapPin className="h-6 w-6 text-[var(--vh-pink)]" />
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_1.2fr]">
                  <div className="space-y-4 text-white/70 text-xs">
                    <p className="leading-5">{locationMap.address}</p>
                    <NeoPopButton variant="secondary" size="sm" asChild>
                      <a href={locationMap.embedUrl} rel="noreferrer" target="_blank">
                        Open in Google Maps
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    </NeoPopButton>

                    <div className="grid gap-2 pt-2">
                      {nearbyAttractions.slice(0, 3).map((attraction) => (
                        <div key={attraction.name} className="border border-white/10 bg-[#12131A] px-3 py-2">
                          <p className="font-bold text-white text-xs">{attraction.name}</p>
                          <p className="mt-0.5 text-[10px] uppercase text-white/50">{attraction.type} · {attraction.travel}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-none border border-white/10 bg-[#12131A]">
                    <iframe
                      allowFullScreen
                      className="h-[220px] w-full md:h-full md:min-h-[260px]"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={locationMap.embedUrl}
                      title={`${locationMap.title} map`}
                    />
                  </div>
                </div>
              </div>
            </motion.article>
          </div>

          {/* Cancellation & Help Section */}
          <section className="rounded-none border border-white/15 bg-[#171822] p-6 shadow-[6px_6px_0px_#000000]">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-white/10 pb-5">
              <div className="max-w-3xl space-y-2">
                <Token variant="brand" label="SUPPORT & POLICIES" />
                <h2 className="font-['Cirka',serif] text-2xl text-white md:text-3xl tracking-tight">Need assistance with your booking?</h2>
                <p className="text-xs leading-6 text-white/70">Reach out directly via email for check-in queries, timing updates, or modification requests.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <NeoPopButton variant="primary" asChild>
                  <a href={supportWhatsAppHref}>
                    Contact Support
                  </a>
                </NeoPopButton>
                <NeoPopButton variant="secondary" asChild>
                  <a href={cancelRequestHref}>
                    Cancel Request
                  </a>
                </NeoPopButton>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-4 border border-white/10 bg-[#12131A] p-5">
                <h3 className="font-['Cirka',serif] text-xl text-white tracking-tight">Cancellation Milestones</h3>
                <div className="space-y-3">
                  {cancellationMilestones.map((milestone) => (
                    <div key={milestone.label} className="grid gap-2 border-b border-white/10 pb-2.5 last:border-b-0 last:pb-0 md:grid-cols-[140px_minmax(0,1fr)] md:items-start text-xs">
                      <div>
                        <p className="font-extrabold uppercase text-white/50 text-[10px]">{milestone.label}</p>
                        <p className="font-bold text-white mt-0.5">{milestone.date}</p>
                      </div>
                      <div>
                        <p className="text-white/70 leading-5">{milestone.copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 border border-white/10 bg-[#12131A] p-5 text-xs text-white/70">
                <h3 className="font-['Cirka',serif] text-xl text-white tracking-tight">Hostel Conduct & Verification</h3>
                <p className="leading-6">All guests must be at least 18 years of age. A valid physical government-issued ID (Passport, Aadhaar, Driving Licence) is mandatory at check-in.</p>
                <DashedSeparator />
                <ul className="space-y-1.5">
                  {propertyGuidelines.summary.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-[var(--vh-pink)]">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {errorMessage ? (
            <div className="rounded-none border border-[#EE4D37] bg-[#1F1414] px-4 py-3 text-xs text-[#EE4D37]">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
