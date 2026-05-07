"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, ChevronRight, MapPin, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { propertyHero, propertyGuidelines } from "@/content/rooms";
import { cn } from "@/lib/utils";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDateLabel(value?: string | null): string {
  if (!value) {
    return "TBA";
  }

  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "TBA";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function getNightCount(checkIn?: string | null, checkOut?: string | null): number {
  if (!checkIn || !checkOut) {
    return 1;
  }

  const start = new Date(`${checkIn.slice(0, 10)}T12:00:00`).getTime();
  const end = new Date(`${checkOut.slice(0, 10)}T12:00:00`).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 1;
  }

  return Math.max(1, Math.round((end - start) / 86400000));
}

export function BookingPageShell({
  badge,
  title,
  description,
  sectionClassName,
  children,
}: {
  badge?: string;
  title: string;
  description?: string;
  sectionClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("min-h-screen bg-[#07070a] pb-20 pt-24 md:pb-24 md:pt-28", sectionClassName)}>
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="flex flex-col gap-8">
          <div className="mx-auto max-w-3xl text-center">
            {badge ? (
              <p className="inline-flex rounded-full border border-[rgba(198,40,40,0.35)] bg-[rgba(198,40,40,0.12)] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--vh-pink)]">
                {badge}
              </p>
            ) : null}
            <h1 className="vh-title mt-4 text-center text-[26px] leading-[1.12] text-white md:text-[30px]">{title}</h1>
            {description ? <p className="mt-3 max-w-2xl text-base leading-7 text-[#99A1AF]">{description}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

export function BookingSummaryCard({
  eyebrow,
  title,
  checkIn,
  checkOut,
  status,
  meta,
  actions,
  children,
  tone = "dark",
}: {
  eyebrow: string;
  title: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  tone?: "dark" | "ticket";
}) {
  const nights = getNightCount(checkIn, checkOut);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] border shadow-[var(--vh-shadow-lg)]",
        tone === "ticket"
          ? "border-[#0f172a] bg-[#facc15] text-[#0f172a]"
          : "border-white/12 bg-[var(--vh-panel-strong)] text-white",
      )}
    >
      <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_260px] md:p-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={cn("text-xs font-bold uppercase tracking-[0.18em]", tone === "ticket" ? "text-[#0f172a]/65" : "text-[var(--vh-pink)]")}>
                {eyebrow}
              </p>
              <h2 className="mt-2 font-suez text-3xl uppercase tracking-[-0.04em]">{title}</h2>
            </div>
            {status ? (
              <div
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em]",
                  tone === "ticket" ? "border border-[#0f172a]/20 bg-[#c62828] text-white" : "bg-[rgba(198,40,40,0.16)] text-[var(--vh-pink)]",
                )}
              >
                {status.replaceAll("_", " ")}
              </div>
            ) : null}
          </div>

          <div className={cn("grid gap-4 rounded-[24px] p-4 md:grid-cols-3", tone === "ticket" ? "bg-[#0f172a] text-white" : "bg-white/5")}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-60">Check In</p>
              <p className="mt-2 text-lg font-semibold">{formatDateLabel(checkIn)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-60">Check Out</p>
              <p className="mt-2 text-lg font-semibold">{formatDateLabel(checkOut)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-60">Stay</p>
              <p className="mt-2 text-lg font-semibold">
                {nights} {nights === 1 ? "Night" : "Nights"}
              </p>
            </div>
          </div>

          {meta ? <div className="text-sm leading-7 opacity-85">{meta}</div> : null}
          {children}
        </div>

        <div className={cn("space-y-4 rounded-[24px] border p-5", tone === "ticket" ? "border-[#0f172a]/15 bg-white/45" : "border-white/10 bg-white/5")}>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[var(--vh-pink)]" />
              <div>
                <p className="text-sm font-semibold">Check-in from {propertyGuidelines.checkIn}</p>
                <p className="text-xs opacity-70">Direct property confirmation follows payment capture.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--vh-cyan)]" />
              <div>
                <p className="text-sm font-semibold">ID verification required</p>
                <p className="text-xs opacity-70">Pre-arrival KYC is completed per guest slot before check-in.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--vh-amber)]" />
              <div>
                <p className="text-sm font-semibold">{propertyHero.addressName}</p>
                <p className="text-xs opacity-70">{propertyHero.address}</p>
              </div>
            </div>
          </div>

          {actions}
        </div>
      </div>
    </div>
  );
}

export function BookingEmptyState({
  title,
  description,
  ctaHref = "/property",
  ctaLabel = "Return to property",
}: {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="rounded-[16px] border border-white/12 bg-[#1A1A1A] p-8 text-center shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
      <h2 className="text-3xl font-black tracking-tight text-white">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#99A1AF]">{description}</p>
      <Button asChild className="mt-6 rounded-[10px] bg-[var(--vh-pink)] px-6 text-white hover:bg-[var(--vh-pink-soft)]">
        <Link href={ctaHref}>
          {ctaLabel}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
