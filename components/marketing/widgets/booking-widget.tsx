"use client";

import Link from "next/link";
import { forwardRef, useEffect, useMemo, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import type { DateRange } from "react-day-picker";
import { ArrowRight, CalendarDays, ChevronDown } from "lucide-react";

import type { BookingWidgetProps } from "@/content/types";
import { cn } from "@/lib/utils";
import { Button as NeoPopButton } from "@/components/neopop";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const variantClasses: Record<NonNullable<BookingWidgetProps["variant"]>, string> = {
  hero: "",
  cta: "border border-[#3D3D3D] bg-[#121212] p-4 text-white shadow-[4px_4px_0px_#000000]",
  inline: "border border-[#3D3D3D] bg-[#121212] p-4 text-white shadow-[4px_4px_0px_#000000]",
};

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
  return (
    <button
      ref={ref}
      {...props}
      aria-expanded={open}
      className={cn(
        "flex w-full items-center gap-3 border border-[#3D3D3D] bg-[#161616] text-left text-white hover:border-white/40 transition-colors shadow-[2px_2px_0px_#000000] cursor-pointer",
        variant === "hero" ? "px-4 py-3.5 md:px-5" : "px-3.5 py-3",
        className,
      )}
    >
      <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 md:gap-4">
        <span className="inline-flex items-center justify-center text-[var(--np-yellow)]">
          <CalendarDays className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50 font-['Gilroy',sans-serif]">Check-In</p>
          <p className="mt-0.5 text-sm font-extrabold text-white font-['Gilroy',sans-serif]">{formatShortDate(dateRange?.from)}</p>
        </div>
        <div className="min-w-0 border-l border-[#3D3D3D] pl-3 md:pl-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50 font-['Gilroy',sans-serif]">Check-Out</p>
          <p className="mt-0.5 text-sm font-extrabold text-white font-['Gilroy',sans-serif]">{formatShortDate(dateRange?.to)}</p>
        </div>
      </div>
      <span className="inline-flex h-7 w-7 items-center justify-center border border-[#3D3D3D] bg-black/60 text-white/70">
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </span>
    </button>
  );
});

export function BookingWidget({
  destinationHref = "/property",
  initialCheckIn = "",
  initialCheckOut = "",
  submitLabel = "Check Dates",
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
        <div className="border border-[#3D3D3D] bg-[#0D0D0D]/95 p-4 shadow-[6px_6px_0px_#000000] backdrop-blur-xl">
          <Popover onOpenChange={setOpen} open={open}>
            <PopoverTrigger asChild>
              <DateSummaryButton dateRange={dateRange} open={open} variant={variant} />
            </PopoverTrigger>
            <PopoverContent
              align="center"
              className={cn(
                "z-[200] w-auto border border-[#3D3D3D] bg-[#121212] p-4 shadow-[8px_8px_0px_#000000] rounded-none",
                isDesktopCalendar ? "max-w-[min(100vw-2rem,860px)]" : "max-w-[min(100vw-2rem,360px)]",
              )}
            >
              <Calendar
                className="vh-calendar-dark vh-calendar-balanced rounded-none"
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
            <NeoPopButton
              asChild
              disabled={validationMessage.length > 0}
              fullWidth
              size="default"
              variant="primary"
              endIcon={<ArrowRight className="h-4 w-4" />}
            >
              <Link href={destinationWithDates}>
                {submitLabel}
              </Link>
            </NeoPopButton>
          </div>

          <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.1em] text-white/55 font-['Gilroy',sans-serif]">
            Lock the dates now. Sort the rest when you get here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={variantClasses[variant]}>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <DateSummaryButton dateRange={dateRange} open={open} variant={variant} />
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className={cn(
            "z-[200] w-auto border border-[#3D3D3D] bg-[#121212] p-4 shadow-[8px_8px_0px_#000000] rounded-none",
            isDesktopCalendar ? "max-w-[min(100vw-2rem,860px)]" : "max-w-[min(100vw-2rem,420px)]",
          )}
        >
          <Calendar
            className="vh-calendar-dark vh-calendar-balanced rounded-none"
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

      <div className="mt-3">
        <NeoPopButton
          asChild
          disabled={validationMessage.length > 0}
          fullWidth
          size="default"
          variant="primary"
        >
          <Link href={destinationWithDates}>{submitLabel}</Link>
        </NeoPopButton>
      </div>
    </div>
  );
}
