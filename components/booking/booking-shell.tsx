"use client";

import type { ReactNode } from "react";
import { CalendarDays, ChevronRight, MapPin, ShieldCheck } from "lucide-react";

import { Button as NeoPopButton } from "@/components/neopop/button";
import { DocumentLink } from "@/components/static-export/document-link";
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
    <section className={cn("min-h-screen bg-[#0D0D0D] pb-20 pt-24 text-white md:pb-24 md:pt-28 font-['Gilroy',sans-serif]", sectionClassName)}>
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="flex flex-col gap-8">
          <div className="mx-auto max-w-3xl text-center">
            {badge ? (
              <span className="inline-block border border-[var(--np-yellow)] bg-[var(--np-yellow)] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-black rounded-none">
                {badge}
              </span>
            ) : null}
            <h1 className="mt-4 text-center font-['Cirka',serif] text-[28px] leading-[1.12] text-white tracking-tight md:text-[34px]">{title}</h1>
            {description ? <p className="mt-3 max-w-2xl text-base leading-7 text-white/70 font-['Gilroy',sans-serif]">{description}</p> : null}
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
        "overflow-hidden rounded-none border shadow-[6px_6px_0px_#000000] font-['Gilroy',sans-serif]",
        tone === "ticket"
          ? "border-[var(--np-yellow)] bg-[#161616] text-white shadow-[6px_6px_0px_var(--np-yellow)]"
          : "border-[#3D3D3D] bg-[#161616] text-white",
      )}
    >
      <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_260px] md:p-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-[#3D3D3D] pb-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--np-yellow)]">
                {eyebrow}
              </p>
              <h2 className="mt-2 font-['Cirka',serif] text-3xl uppercase tracking-tight">{title}</h2>
            </div>
            {status ? (
              <div className="border border-[#3D3D3D] bg-[#121212] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--np-yellow)]">
                {status.replaceAll("_", " ")}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 border border-[#3D3D3D] bg-[#121212] p-4 md:grid-cols-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/50">Check In</p>
              <p className="mt-1 text-lg font-bold text-white">{formatDateLabel(checkIn)}</p>
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/50">Check Out</p>
              <p className="mt-1 text-lg font-bold text-white">{formatDateLabel(checkOut)}</p>
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/50">Stay Duration</p>
              <p className="mt-1 text-lg font-bold text-white">
                {nights} {nights === 1 ? "Night" : "Nights"}
              </p>
            </div>
          </div>

          {meta ? <div className="text-sm leading-7 text-white/80">{meta}</div> : null}
          {children}
        </div>

        <div className="space-y-4 border border-[#3D3D3D] bg-[#121212] p-5">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[var(--np-yellow)]" />
              <div>
                <p className="text-sm font-bold text-white">Check-in from {propertyGuidelines.checkIn}</p>
                <p className="text-xs text-white/60">Direct property confirmation follows payment capture.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--np-yellow)]" />
              <div>
                <p className="text-sm font-bold text-white">ID Verification Required</p>
                <p className="text-xs text-white/60">Pre-arrival KYC is completed per guest slot before check-in.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--np-yellow)]" />
              <div>
                <p className="text-sm font-bold text-white">{propertyHero.addressName}</p>
                <p className="text-xs text-white/60">{propertyHero.address}</p>
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
    <div className="rounded-none border border-[#3D3D3D] bg-[#161616] p-8 text-center shadow-[6px_6px_0px_#000000] font-['Gilroy',sans-serif]">
      <h2 className="font-['Cirka',serif] text-3xl font-bold tracking-tight text-white">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/70">{description}</p>
      <div className="mt-6 flex justify-center">
        <NeoPopButton variant="primary" asChild>
          <DocumentLink href={ctaHref}>
            {ctaLabel}
            <ChevronRight className="ml-2 h-4 w-4" />
          </DocumentLink>
        </NeoPopButton>
      </div>
    </div>
  );
}
