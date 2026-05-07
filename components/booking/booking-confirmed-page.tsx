"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import { motion } from "motion/react";
import gsap from "gsap";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { StickerTag } from "@/components/shared/sticker-tag";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { locationMap, nearbyAttractions, propertyGuidelines } from "@/content/rooms";
import { siteMeta } from "@/content/site";
import { linkGuestBooking, type LinkGuestBookingResponse } from "@/lib/booking-api";
import { withBrandName, toAbsoluteBrandCheckinLink, toBrandCheckinLink } from "@/lib/branding";
import { getConfirmedBookingSnapshot } from "@/lib/booking-session";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { cn } from "@/lib/utils";
import { toSafeErrorMessage } from "@/lib/ui-error";
import { useDownloadReceipt } from "@/hooks/use-download-receipt";

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
      copy: "If the plan is still soft, this is your cleanest window to sort it.",
      tone: "good",
    },
    {
      label: "5 days before arrival",
      date: formatPolicyDate(fiveDaysBefore),
      copy: "Past this point, the refund window starts acting less generous.",
      tone: "warn",
    },
    {
      label: "48 hours before check-in",
      date: formatPolicyDate(twoDaysBefore),
      copy: "Last sensible stop before the no-refund road.",
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
      <line className="stroke-[var(--vh-border)]" strokeDasharray="8, 5" strokeLinecap="round" strokeWidth="1" x1="0" x2="100%" y1="0" y2="0" />
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

  useLayoutEffect(() => {
    if (!tilesRef.current) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-confirmation-tile]",
        { opacity: 0, y: 20, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.08,
        },
      );
    }, tilesRef);

    return () => {
      ctx.revert();
    };
  }, []);

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
  const supportPhoneDigits = siteMeta.contact.phoneDisplay.replace(/\D/g, "");

  const whatsappShareHref = useMemo(() => {
    const message = `Bring your vibe, bring your playlist. ${propertyName} is locked in. Tap this to finish your pre-arrival bits: ${absoluteCheckinLink}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [absoluteCheckinLink, propertyName]);

  const supportWhatsAppHref = useMemo(
    () => `https://wa.me/${supportPhoneDigits}?text=${encodeURIComponent(`Hey The Daily Social, I need help with booking ${ezeeReservationId}.`)}`,
    [ezeeReservationId, supportPhoneDigits],
  );

  const cancelRequestHref = useMemo(
    () => `https://wa.me/${supportPhoneDigits}?text=${encodeURIComponent(`Please help me cancel booking ${ezeeReservationId}.`)}`,
    [ezeeReservationId, supportPhoneDigits],
  );

  if (isRestoringSession || isLoading) {
    return (
      <BookingPageShell title="Stay confirmation">
        <div aria-busy="true" aria-live="polite" className="space-y-6" role="status">
          <span className="sr-only">Loading booking confirmation details.</span>
          <div className="rounded-[16px] border border-white/10 bg-[#1A1A1A] px-6 py-7 text-center">
            <Skeleton className="mx-auto h-8 w-64 bg-white/10" />
            <Skeleton className="mx-auto mt-4 h-9 w-40 rounded-full bg-white/10" />
          </div>
        </div>
      </BookingPageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <BookingPageShell title="Sign in to view confirmation" description="This screen is available for the guest account linked to this booking.">
        <div className="rounded-[16px] border border-white/12 bg-[#1A1A1A] p-8 text-center shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
          <p className="font-sectiontitle text-lg text-white">One booking, one grown-up login.</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/72">Sign in with the account that owns the stay. We’ll pull up the confirmation and the useful bits.</p>
          <Button className="vh-cta-button mt-6" onClick={() => openAuthModal("signin")} type="button">
            Sign in to continue
          </Button>
        </div>
      </BookingPageShell>
    );
  }

  if (!bookingDetail && !snapshotFallback) {
    return (
      <BookingPageShell title="Confirmation unavailable" description="We could not open a recent confirmation snapshot for this booking.">
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
    <section className="min-h-screen bg-[#07070a] pb-16 pt-24 animate-vh-fade-in md:pt-28">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div ref={tilesRef} className="space-y-7">
          <header className="text-center">
            <div className="flex justify-center">
              <StickerTag
                bg="#f9cb37"
                className="px-3 py-1.5 text-[11px] font-bold not-italic uppercase tracking-[0.12em]"
                label="Reservation Locked"
                rotate="rotate-[-2deg]"
                text="#111111"
              />
            </div>
            <h1 className="vh-title text-center text-[26px] leading-[1.12] text-white md:text-[30px]">
              Bags packed. Vibes ready. <br />
              <span className="text-[var(--vh-pink)]">{propertyName}</span> is ready for you.
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/72">
              Stay confirmed. Bring the playlist, keep the phone charged, and let the check-in drama stay in the draft folder.
            </p>
          </header>

          <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            <motion.article className="lg:col-span-7" initial={false} whileHover={{ y: -4 }} data-confirmation-tile>
              <div className="flex h-full flex-col rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] md:p-6">
                <div className="space-y-2">
                  <StickerTag bg="#f9cb37" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" label="Share the vibe" rotate="rotate-[-2deg]" text="#111111" />
                  <h2 className="font-sectiontitle text-[22px] text-white md:text-[24px]">Send the check-in link without turning it into a group-chat essay.</h2>
                  <p className="max-w-xl text-sm leading-7 text-white/74">Share the pre-arrival link on WhatsApp and let the crew sort their bits before they hit the door.</p>
                </div>

                <div className="mt-5 flex flex-1 flex-col gap-4 rounded-[18px] border border-white/10 bg-black/20 p-4 md:p-5">
                  <div className="flex items-center gap-3 text-white/88">
                    {checkinDate ? <CheckCircle2 className="h-5 w-5 text-[#05DF72]" /> : <ShieldCheck className="h-5 w-5 text-[var(--vh-cyan)]" />}
                    <p className="font-body">{checkinDate ? "Your stay is confirmed. The least chaotic path is still WhatsApp." : "Tiny task now, zero chaos later. Tap WhatsApp and move like a person with plans."}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <a className="vh-cta-button" href={whatsappShareHref} rel="noreferrer" target="_blank">
                      <WhatsAppIcon className="h-5 w-5" />
                      Share on WhatsApp
                    </a>
                    <span className="text-sm text-white/60">No raw link on the page. That’s the whole point.</span>
                  </div>

                  <DashedSeparator />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                      <p className="font-caption text-white/55">Check-in</p>
                      <p className="font-subtitle mt-1 text-white">{formatScheduleDate(checkinDate)} · {propertyGuidelines.checkIn}</p>
                    </div>
                    <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                      <p className="font-caption text-white/55">Check-out</p>
                      <p className="font-subtitle mt-1 text-white">{formatScheduleDate(checkoutDate)} · {propertyGuidelines.checkOut}</p>
                    </div>
                  </div>

                  <p className="text-sm leading-7 text-white/72">This is the main guest page. No co-guest label, no extra noise, just the part that actually matters.</p>
                </div>
              </div>
            </motion.article>

            <motion.article className="lg:col-span-5" initial={false} whileHover={{ y: -4 }} data-confirmation-tile>
              <div className="flex h-full flex-col rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] md:p-6">
                <div className="flex items-center gap-3">
                  <StickerTag bg="#f9cb37" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" label="Stay timeline" rotate="rotate-[1deg]" text="#111111" />
                </div>

                <div className="mt-4 space-y-4">
                  <h2 className="font-sectiontitle text-[22px] text-white">Stay Timeline</h2>

                  <div className="flex items-start gap-3 rounded-[18px] border border-white/10 bg-black/20 p-4">
                    <span className="text-xl">🗓️</span>
                    <div className="flex flex-1 items-center gap-4 sm:gap-8">
                      <div>
                        <span className="font-caption block text-white/55">Check-in</span>
                        <span className="font-subtitle sm:font-body">{formatScheduleDate(checkinDate)}, {propertyGuidelines.checkIn}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-white/55" />
                      <div>
                        <span className="font-caption block text-white/55">Check-out</span>
                        <span className="font-subtitle sm:font-body">{formatScheduleDate(checkoutDate)}, {propertyGuidelines.checkOut}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm leading-7 text-white/72">
                    <p>Show up with your ID, keep the booking name handy, and let the front desk keep its coffee break.</p>
                    <p>{checkinDate ? "You’ve already handled the hardest part. Nice." : "Finish the pre-arrival bits when you’re free so arrival stays easy and low-drama."}</p>
                  </div>
                </div>

                <div className="mt-auto pt-6 text-center">
                  <p className="mx-auto max-w-xs text-sm leading-6 text-white/68">Want the boring bits handled before arrival? Open the pre-arrival dashboard and sort it in one shot.</p>
                  <div className="mt-4 flex justify-center">
                    <Link className="vh-cta-button px-7 py-3.5 text-base" href={checkinLink}>
                      Open Pre-Arrival Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </motion.article>

            <motion.article className="lg:col-span-5" initial={false} whileHover={{ y: -4 }} data-confirmation-tile>
              <div className="h-full rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <StickerTag bg="#f9cb37" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" label="Room lowdown" rotate="rotate-[-2deg]" text="#111111" />
                    <h2 className="mt-3 font-sectiontitle text-[22px] text-white">Room Info</h2>
                  </div>
                  <BadgeCheck className="h-5 w-5 text-[var(--vh-cyan)]" />
                </div>

                <div className="mt-4 space-y-3 text-white/82">
                  <p className="font-bodyfocus text-[18px] text-white">{roomSummary}</p>
                  <p className="font-body text-sm leading-7 text-white/72">{propertyName}</p>
                  {snapshotFallback?.roomTypeName ? <p className="font-body text-sm leading-7 text-white/66">{snapshotFallback.roomTypeName}</p> : null}
                  {snapshotFallback?.roomSummary && snapshotFallback.roomSummary !== roomSummary ? <p className="font-body text-sm leading-7 text-white/66">{snapshotFallback.roomSummary}</p> : null}
                  {booking?.room_number ? <p className="font-body text-sm leading-7 text-white/66">Room {booking.room_number}</p> : null}
                </div>

                <div className="mt-5 space-y-3 rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-[var(--vh-cyan)]" />
                    <p className="font-body text-sm text-white/78">Bring a valid government ID and the same name used for the booking.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-[var(--vh-pink)]" />
                    <p className="font-body text-sm text-white/78">Quiet enough to crash, social enough to not feel like a waiting room.</p>
                  </div>
                </div>

                {/* Download Receipt CTA */}
                <div className="mt-5 pt-4 border-t border-white/10">
                  <button
                    id="download-receipt-btn"
                    type="button"
                    onClick={() => void downloadReceipt()}
                    disabled={isReceiptGenerating}
                    className="vh-cta-button w-full justify-center gap-2 disabled:pointer-events-none disabled:opacity-60"
                  >
                    {isReceiptGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {isReceiptGenerating ? "Generating receipt…" : "Download Receipt"}
                  </button>
                  {receiptError ? (
                    <p className="mt-2 text-center text-xs leading-6 text-[#ffd9d4]">
                      {receiptError}
                    </p>
                  ) : null}
                  <p className="mt-2 text-center text-xs leading-6 text-white/44">
                    Downloads a PDF copy of your booking receipt.
                  </p>
                </div>
              </div>
            </motion.article>

            <motion.article className="lg:col-span-7" initial={false} whileHover={{ y: -4 }} data-confirmation-tile>
              <div className="h-full rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <StickerTag bg="#f9cb37" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" label="Money stuff" rotate="rotate-[1deg]" text="#111111" />
                    <h2 className="mt-3 font-sectiontitle text-[22px] text-white">Payment Info</h2>
                  </div>
                  <WalletCards className="h-5 w-5 text-[var(--vh-cyan)]" />
                </div>

                <div className="mt-5 space-y-4">
                  <div className="flex flex-col gap-4 text-white/82">
                    <div className="flex items-center justify-between gap-6">
                      <span className="font-body">Total room charges</span>
                      <span className="font-body">{formatCurrencyValue(paymentBreakdown.subtotalRooms)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <span className="font-body">Add-on charges</span>
                      <span className="font-body">{formatCurrencyValue(paymentBreakdown.subtotalAddons)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <span className="font-body">Total taxes</span>
                      <span className="font-body">{formatCurrencyValue(paymentBreakdown.taxes)}</span>
                    </div>
                    <DashedSeparator />
                    <div className="flex items-center justify-between gap-6">
                      <span className="font-bodyfocus">Grand Total</span>
                      <span className="font-bodyfocus">{formatCurrencyValue(paymentBreakdown.grandTotal)}</span>
                    </div>
                    <DashedSeparator />
                    <div className="flex items-center justify-between gap-6">
                      <span className="font-body">Amount Paid</span>
                      <span className="font-body">- {formatCurrencyValue(paymentBreakdown.amountPaid)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <span className="font-bodyfocus">Amount Due</span>
                      <span className="font-bodyfocus">{formatCurrencyValue(paymentBreakdown.amountDue)}</span>
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/72">
                    We keep this simple: what was booked, what was paid, and what is still hanging around waiting to be settled.
                  </div>
                </div>
              </div>
            </motion.article>

            <motion.article className="lg:col-span-5" initial={false} whileHover={{ y: -4 }} data-confirmation-tile>
              <div className="h-full rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <StickerTag bg="#f9cb37" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" label="Move first, ask later" rotate="rotate-[-1deg]" text="#111111" />
                    <h2 className="mt-3 font-sectiontitle text-[22px] text-white">Check-in / Check-out</h2>
                  </div>
                  <CalendarDays className="h-5 w-5 text-[var(--vh-cyan)]" />
                </div>

                <div className="mt-5 space-y-4 rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start gap-3">
                    <span>🗓️</span>
                    <div className="flex flex-1 items-center gap-4 sm:gap-8">
                      <div>
                        <span className="font-caption block text-white/55">Check-in</span>
                        <span className="font-subtitle sm:font-body">{formatScheduleDate(checkinDate)}, {propertyGuidelines.checkIn}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-white/55" />
                      <div>
                        <span className="font-caption block text-white/55">Check-out</span>
                        <span className="font-subtitle sm:font-body">{formatScheduleDate(checkoutDate)}, {propertyGuidelines.checkOut}</span>
                      </div>
                    </div>
                  </div>

                  <DashedSeparator />

                  <div className="space-y-3 text-white/76">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-[#05DF72]" />
                      <p className="font-body text-sm leading-7">Bring your ID. The desk likes receipts, not mysteries.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <TriangleAlert className="h-4 w-4 text-[var(--vh-pink)]" />
                      <p className="font-body text-sm leading-7">Late arrival? Cool. Just don’t ghost the booking and call it vibes.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-[var(--vh-cyan)]" />
                      <p className="font-body text-sm leading-7">Sort the boring bits now so the arrival stays easy and low-drama.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.article>

            <motion.article className="lg:col-span-7" initial={false} whileHover={{ y: -4 }} data-confirmation-tile>
              <div className="h-full rounded-[22px] border border-dashed border-[rgba(255,255,255,0.3)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <StickerTag bg="#f9cb37" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" label="Where to roll in" rotate="rotate-[1deg]" text="#111111" />
                    <h2 className="mt-3 font-sectiontitle text-[22px] text-white">How to Reach</h2>
                  </div>
                  <MapPin className="h-5 w-5 text-[var(--vh-cyan)]" />
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_1.2fr]">
                  <div className="space-y-4 text-white/76">
                    <p className="font-body text-sm leading-7">{locationMap.address}</p>
                    <a className="vh-cta-button w-full justify-center md:w-auto" href={locationMap.embedUrl} rel="noreferrer" target="_blank">
                      Open in Maps
                      <ExternalLink className="h-4 w-4" />
                    </a>

                    <div className="grid gap-3 pt-1">
                      {nearbyAttractions.slice(0, 3).map((attraction) => (
                        <div key={attraction.name} className="rounded-[14px] border border-white/10 bg-black/20 px-3 py-3">
                          <p className="font-bodyfocus text-sm text-white">{attraction.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/55">{attraction.type} · {attraction.travel}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[18px] border border-white/10 bg-black/20">
                    <iframe
                      allowFullScreen
                      className="h-[260px] w-full md:h-full md:min-h-[340px]"
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

          <section className="rounded-[22px] border border-dashed border-[rgba(255,255,255,0.24)] bg-[#07070a] p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl space-y-2">
                <StickerTag bg="#f9cb37" className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]" label="Plan B, in plain English" rotate="rotate-[-2deg]" text="#111111" />
                <h2 className="font-sectiontitle text-[22px] text-white md:text-[24px]">If the trip gets weird, here’s the human version of the rules.</h2>
                <p className="text-sm leading-7 text-white/72">No legal marathon. Just the useful bits, with enough detail to keep everyone from playing confused later.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a className="vh-cta-button" href={supportWhatsAppHref} rel="noreferrer" target="_blank">
                  <WhatsAppIcon className="h-5 w-5" />
                  WhatsApp The Daily Social
                </a>
                <a className="vh-cta-button bg-white text-[#07070a] hover:bg-white/90" href={cancelRequestHref} rel="noreferrer" target="_blank">
                  Cancel booking request
                </a>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-4 rounded-[18px] border border-white/10 bg-black/20 p-4 md:p-5">
                <h3 className="font-sectiontitle text-lg text-white">Cancellation game plan</h3>
                <div className="space-y-4">
                  {cancellationMilestones.map((milestone) => (
                    <div key={milestone.label} className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)] md:items-start">
                      <div className="flex items-center gap-3 md:justify-start">
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm", milestone.tone === "good" && "bg-[#05DF72]/15 text-[#05DF72]", milestone.tone === "warn" && "bg-[#facc15]/15 text-[#facc15]", milestone.tone === "bad" && "bg-[#ff6a5f]/15 text-[#ff6a5f]", milestone.tone === "checkin" && "bg-[var(--vh-cyan)]/15 text-[var(--vh-cyan)]")}>
                          {milestone.tone === "good" ? "✅" : milestone.tone === "warn" ? "⚠️" : milestone.tone === "bad" ? "😢" : "🏨"}
                        </div>
                        <div className="md:hidden">
                          <p className="font-caption text-white/55">{milestone.label}</p>
                          <p className="font-smallbutton mt-0.5 text-white">{milestone.date}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="hidden md:block md:w-[180px]">
                          <p className="font-caption text-white/55">{milestone.label}</p>
                          <p className="font-smallbutton mt-0.5 text-white">{milestone.date}</p>
                        </div>
                        <div className="flex-1">
                          <p className="font-body text-sm leading-7 text-white/76">{milestone.copy}</p>
                          <p className="font-body text-xs uppercase tracking-[0.12em] text-white/48">{milestone.tone === "checkin" ? "Check-in day" : milestone.tone === "good" ? "Easy mode" : milestone.tone === "warn" ? "Partial-refund zone" : "No-refund zone"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 rounded-[18px] border border-white/10 bg-black/20 p-4 md:p-5">
                <h3 className="font-sectiontitle text-lg text-white">Privacy, minus the corporate speech</h3>
                <div className="space-y-3 text-sm leading-7 text-white/76">
                  <p>We use your booking details to manage the stay, keep check-in moving, and stop the desk from asking the same thing twice.</p>
                  <p>Guest info stays inside the booking flow and gets handled for compliance, support, and property operations only.</p>
                  <p>If a partner rate or special booking rule exists, that rule gets the final word.</p>
                </div>

                <DashedSeparator />

                <div className="space-y-3 text-sm leading-7 text-white/76">
                  <p>The Daily Social doesn’t do copy-paste legal fog. We keep it readable and compliant.</p>
                  <ul className="space-y-2">
                    {propertyGuidelines.summary.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="mt-1 text-[var(--vh-cyan)]">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

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
