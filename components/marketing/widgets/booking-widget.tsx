"use client";

import Link from "next/link";
import { forwardRef, useEffect, useMemo, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import type { DateRange } from "react-day-picker";
import { ArrowRight, CalendarDays, ChevronDown } from "lucide-react";

import type { BookingWidgetProps } from "@/content/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const variantClasses: Record<NonNullable<BookingWidgetProps["variant"]>, string> = {
  hero: "",
  cta: "rounded-[20px] border border-white/10 bg-white/95 p-3.5 text-slate-900 shadow-[0px_16px_24px_-6px_rgba(0,0,0,0.14)]",
  inline: "rounded-[18px] border border-white/12 bg-white/95 p-3.5 text-slate-900 shadow-[0px_16px_24px_-6px_rgba(0,0,0,0.14)]",
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
  const tone =
    variant === "hero"
      ? {
          wrapper: "border-transparent bg-[rgba(15,16,26,0.76)] text-white hover:bg-[rgba(15,16,26,0.82)]",
          label: "text-white/56",
          value: "text-white",
          separator: "border-white/12",
          icon: "text-[var(--vh-cyan)]",
          chevronWrap: "bg-white/8 text-white/70",
        }
      : {
          wrapper: "border-transparent bg-white text-slate-900 hover:bg-white",
          label: "text-slate-500",
          value: "text-slate-900",
          separator: "border-slate-200",
          icon: "text-[var(--vh-pink)]",
          chevronWrap: "bg-slate-100 text-slate-500",
        };

  return (
    <button
      ref={ref}
      {...props}
      aria-expanded={open}
      className={cn(
        "flex w-full items-center gap-3 rounded-[18px] border text-left",
        variant === "hero" ? "px-4 py-3.5 md:px-5" : "px-3.5 py-3",
        tone.wrapper,
        className,
      )}
    >
      <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 md:gap-4">
        <span className={cn("inline-flex items-center justify-center", tone.icon)}>
          <CalendarDays className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", tone.label)}>Check-In</p>
          <p className={cn("mt-1 text-sm font-semibold", tone.value)}>{formatShortDate(dateRange?.from)}</p>
        </div>
        <div className={cn("min-w-0 border-l pl-3 md:pl-4", tone.separator)}>
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", tone.label)}>Check-Out</p>
          <p className={cn("mt-1 text-sm font-semibold", tone.value)}>{formatShortDate(dateRange?.to)}</p>
        </div>
      </div>
      <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full", tone.chevronWrap)}>
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
        <div className="rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(29,18,26,0.92),rgba(18,11,18,0.96))] p-3.5 shadow-[0_24px_52px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-4">
          <Popover onOpenChange={setOpen} open={open}>
            <PopoverTrigger asChild>
              <DateSummaryButton dateRange={dateRange} open={open} variant={variant} />
            </PopoverTrigger>
            <PopoverContent
              align="center"
              className={cn(
                "z-[200] w-auto border-white/10 bg-[var(--vh-panel-strong)] p-3",
                isDesktopCalendar ? "max-w-[min(100vw-2rem,860px)]" : "max-w-[min(100vw-2rem,360px)]",
              )}
            >
              <Calendar
                className="vh-calendar-dark vh-calendar-balanced rounded-[22px]"
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

          <Button
            aria-disabled={validationMessage.length > 0}
            asChild
            className={cn(
              "vh-cta-button mt-3.5 w-full border border-white/5 shadow-[0_10px_24px_rgba(198,40,40,0.28)]",
              validationMessage.length > 0 && "pointer-events-none bg-slate-500 shadow-none hover:translate-y-0",
            )}
          >
            <Link href={destinationWithDates}>
              {submitLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-2.5 text-center text-sm font-semibold text-white/72">
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
            "z-[200] w-auto border-white/10 bg-[var(--vh-panel-strong)] p-3",
            isDesktopCalendar ? "max-w-[min(100vw-2rem,860px)]" : "max-w-[min(100vw-2rem,420px)]",
          )}
        >
          <Calendar
            className="vh-calendar-dark vh-calendar-balanced rounded-[22px]"
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

      <Button
        aria-disabled={validationMessage.length > 0}
        asChild
        className={cn(
          "mt-2.5 flex h-11 w-full rounded-[14px]",
          validationMessage.length > 0 && "pointer-events-none bg-slate-400 shadow-none hover:translate-y-0",
        )}
      >
        <Link href={destinationWithDates}>{submitLabel}</Link>
      </Button>
    </div>
  );
}
