"use client";

import Link from "next/link";
import { forwardRef, useEffect, useMemo, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import type { DateRange } from "react-day-picker";
import { ArrowRight, CalendarDays, ChevronDown, CheckCircle2 } from "lucide-react";

import type { BookingWidgetProps } from "@/content/types";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MagneticButton } from "../interactive/magnetic-button";

function getLocalDate(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function toInputDateString(date?: Date) {
  if (!date) {
    return "";
  }

  const normalized = new Date(date);
  normalized.setHours(12, 0, 0, 0);

  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  const day = String(normalized.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatShortDate(date?: Date) {
  if (!date) {
    return "Select";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function resolveNextRange(current: DateRange | undefined, nextValue: DateRange | undefined, selectedDay?: Date) {
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

type DateSummaryButtonProps = ComponentPropsWithoutRef<"button"> & {
  dateRange: DateRange | undefined;
  open: boolean;
  variant: NonNullable<BookingWidgetProps["variant"]>;
};

const DateSummaryButton = forwardRef<HTMLButtonElement, DateSummaryButtonProps>(function DateSummaryButton(
  {
    className,
    dateRange,
    open,
    variant,
    ...props
  },
  ref,
) {
  const nights = (() => {
    if (!dateRange?.from || !dateRange?.to) return 1;
    const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  })();

  if (variant === "hero") {
    return (
      <button
        ref={ref}
        {...props}
        aria-expanded={open}
        type="button"
        className={cn(
          "flex w-full md:flex-1 items-center justify-between gap-2.5 sm:gap-3 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl md:rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all text-left cursor-pointer group",
          className
        )}
      >
        {/* Left: Check-In Column */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E01E5A]/15 text-[#E01E5A] border border-[#E01E5A]/30 group-hover:scale-105 transition-transform">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-white/50">Check-In</p>
            <p className="text-xs sm:text-sm font-mono font-bold text-white tracking-tight whitespace-nowrap">{formatShortDate(dateRange?.from)}</p>
          </div>
        </div>

        {/* Center: Stay Duration Pill */}
        <div className="flex items-center gap-1.5 shrink-0 px-2.5 sm:px-3 py-1 rounded-full bg-white/[0.05] border border-white/10">
          <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-white/75 whitespace-nowrap">
            {nights} {nights === 1 ? "Night" : "Nights"}
          </span>
        </div>

        {/* Right: Check-Out Column + Snug Chevron */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div>
            <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-white/50">Check-Out</p>
            <p className="text-xs sm:text-sm font-mono font-bold text-white tracking-tight whitespace-nowrap">{formatShortDate(dateRange?.to)}</p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05] border border-white/10 group-hover:border-white/25 transition-colors shrink-0">
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-white/50 group-hover:text-white transition-transform",
                open && "rotate-180 text-[#E01E5A]"
              )}
            />
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      ref={ref}
      {...props}
      aria-expanded={open}
      type="button"
      className={cn(
        "flex w-full items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all text-left text-white cursor-pointer group",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E01E5A]/15 text-[#E01E5A] border border-[#E01E5A]/30">
          <CalendarDays className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div>
            <p className="text-[10px] font-mono font-medium uppercase tracking-wider text-white/50">Check-In</p>
            <p className="text-xs font-mono font-bold text-white">{formatShortDate(dateRange?.from)}</p>
          </div>
          <span className="text-[10px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10">
            {nights}N
          </span>
          <div>
            <p className="text-[10px] font-mono font-medium uppercase tracking-wider text-white/50">Check-Out</p>
            <p className="text-xs font-mono font-bold text-white">{formatShortDate(dateRange?.to)}</p>
          </div>
        </div>
      </div>
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05] border border-white/10 group-hover:border-white/25 transition-colors shrink-0">
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-white/50 group-hover:text-white transition-transform",
            open && "rotate-180 text-[#E01E5A]"
          )}
        />
      </div>
    </button>
  );
});

export function BookingWidget({
  destinationHref = "/property",
  initialCheckIn = "",
  initialCheckOut = "",
  submitLabel = "Check Availability",
  variant = "inline",
}: BookingWidgetProps) {
  const initialFrom = initialCheckIn ? new Date(`${initialCheckIn}T12:00:00`) : getLocalDate(0);
  const initialTo = initialCheckOut ? new Date(`${initialCheckOut}T12:00:00`) : getLocalDate(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: initialFrom,
    to: initialTo < initialFrom ? initialFrom : initialTo,
  });
  const [open, setOpen] = useState(false);
  const [isDesktopCalendar, setIsDesktopCalendar] = useState(false);

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

  // Auto-dismiss popover when scrolling away
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => {
      setOpen(false);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [open]);

  const checkIn = toInputDateString(dateRange?.from);
  const checkOut = toInputDateString(dateRange?.to);
  const validationMessage = useMemo(() => {
    if (!checkIn || !checkOut) {
      return "Select check-in and check-out dates.";
    }

    if (checkOut <= checkIn) {
      return "Check-out must be after check-in.";
    }

    return "";
  }, [checkIn, checkOut]);

  const destinationWithDates = useMemo(() => {
    const [basePath, existingQuery = ""] = destinationHref.split("?", 2);
    const params = new URLSearchParams(existingQuery);

    if (checkIn) {
      params.set("checkin", checkIn);
    }

    if (checkOut) {
      params.set("checkout", checkOut);
    }

    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }, [checkIn, checkOut, destinationHref]);

  if (variant === "hero") {
    return (
      <div className="w-full">
        {/* Floating Capsule Bar */}
        <div className="bg-[#121216]/95 p-2 sm:p-2.5 rounded-2xl md:rounded-full border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center gap-2.5 sm:gap-3 backdrop-blur-2xl">
          <Popover onOpenChange={setOpen} open={open}>
            <PopoverTrigger asChild>
              <DateSummaryButton dateRange={dateRange} open={open} variant="hero" />
            </PopoverTrigger>
            <PopoverContent
              align="center"
              className={cn(
                "z-[200] w-auto border border-white/10 bg-[#16161C]/98 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.9)] rounded-2xl backdrop-blur-2xl",
                isDesktopCalendar ? "max-w-[min(100vw-2rem,860px)]" : "max-w-[min(100vw-2rem,360px)]",
              )}
            >
              <Calendar
                className="vh-calendar-dark vh-calendar-balanced rounded-xl"
                defaultMonth={dateRange?.from}
                mode="range"
                numberOfMonths={isDesktopCalendar ? 2 : 1}
                onSelect={(nextValue, selectedDay) => {
                  const resolvedRange = resolveNextRange(dateRange, nextValue, selectedDay);

                  if (!resolvedRange?.from) {
                    return;
                  }

                  setDateRange(resolvedRange);

                  if (resolvedRange.from && resolvedRange.to && resolvedRange.to > resolvedRange.from) {
                    setTimeout(() => setOpen(false), 220);
                  }
                }}
                selected={dateRange}
                disabled={{ before: getLocalDate(0) }}
              />
            </PopoverContent>
          </Popover>

          {/* Primary CTA */}
          <Link
            href={destinationWithDates}
            className={cn(
              "w-full md:w-auto shrink-0",
              validationMessage.length > 0 && "pointer-events-none opacity-60"
            )}
          >
            <MagneticButton
              className="w-full md:w-auto bg-[#E01E5A] hover:bg-[#F02D6B] text-white rounded-xl md:rounded-full px-7 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(224,30,90,0.4)] active:scale-[0.98]"
            >
              <span>{submitLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </Link>
        </div>
      </div>
    );
  }

  // CTA or Inline Variant
  return (
    <div className="bg-[#121216] p-5 rounded-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <DateSummaryButton dateRange={dateRange} open={open} variant={variant} />
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className={cn(
            "z-[200] w-auto border border-white/10 bg-[#16161C]/98 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.9)] rounded-2xl backdrop-blur-2xl",
            isDesktopCalendar ? "max-w-[min(100vw-2rem,860px)]" : "max-w-[min(100vw-2rem,420px)]",
          )}
        >
          <Calendar
            className="vh-calendar-dark vh-calendar-balanced rounded-xl"
            defaultMonth={dateRange?.from}
            mode="range"
            numberOfMonths={isDesktopCalendar ? 2 : 1}
            onSelect={(nextValue, selectedDay) => {
              const resolvedRange = resolveNextRange(dateRange, nextValue, selectedDay);

              if (!resolvedRange?.from) {
                return;
              }

              setDateRange(resolvedRange);

              if (resolvedRange.from && resolvedRange.to) {
                setOpen(false);
              }
            }}
            selected={dateRange}
            disabled={{ before: getLocalDate(0) }}
          />
        </PopoverContent>
      </Popover>

      <div className="mt-4">
        <Link
          href={destinationWithDates}
          className={cn(
            "w-full block",
            validationMessage.length > 0 && "pointer-events-none opacity-60"
          )}
        >
          <MagneticButton
            className="w-full bg-[#E01E5A] hover:bg-[#F02D6B] text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(224,30,90,0.4)] active:scale-[0.98]"
          >
            <span>{submitLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </Link>
      </div>
    </div>
  );
}
