"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays, ChevronRight, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatColiveDate, formatColiveMoney } from "@/lib/colive-flow-state";

export function ColiveShell({ children }: { children: ReactNode }) {
  return (
    <section className="min-h-screen bg-[#07070a] pb-20 pt-24 text-white md:pb-24 md:pt-28">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">{children}</div>
    </section>
  );
}

export function SectionHeader({
  title,
  copy,
  align = "center",
}: {
  badge?: string;
  title: string;
  copy?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" ? "mx-auto text-center" : "text-left")}>
      <h1 className="vh-title text-[28px] leading-[1.08] text-white md:text-[44px]">{title}</h1>
      {copy ? <p className={cn("mt-4 text-base leading-7 text-[#99A1AF]", align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl")}>{copy}</p> : null}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#99A1AF]">{label}</span>
      <input
        className={cn(
          "mt-2 h-12 w-full rounded-[10px] border bg-[#212121] px-4 text-sm text-white outline-none transition placeholder:text-[#6A7282] focus:border-[var(--vh-pink)]",
          error ? "border-[#ff6a5f]" : "border-white/10",
        )}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? <span className="mt-2 block text-xs font-semibold text-[#ff9b91]">{error}</span> : null}
    </label>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#99A1AF]">{label}</span>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className="mt-2 flex h-12 w-full items-center justify-between rounded-[10px] border border-white/10 bg-[#212121] px-4 text-left text-sm text-white hover:bg-[#242424]"
            type="button"
          >
            <span>{formatColiveDate(value)}</span>
            <CalendarDays className="h-4 w-4 text-[#99A1AF]" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="z-[220] w-auto border-white/10 bg-[#151515] p-2 text-white">
          <Calendar
            disabled={{ before: new Date() }}
            mode="single"
            onSelect={(date) => {
              if (!date) {
                return;
              }
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const day = String(date.getDate()).padStart(2, "0");
              onChange(`${year}-${month}-${day}`);
              setIsOpen(false);
            }}
            selected={selected}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ApiStatePanel({
  title,
  copy,
  actionLabel,
  onAction,
  tone = "error",
}: {
  title: string;
  copy: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "error" | "empty" | "loading";
}) {
  const isLoading = tone === "loading";
  return (
    <div className="rounded-[24px] border border-white/12 bg-[var(--vh-panel-strong)] p-6 text-center shadow-[var(--vh-shadow-lg)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/5">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-[var(--vh-amber)]" /> : <ShieldCheck className="h-5 w-5 text-[var(--vh-pink)]" />}
      </div>
      <h2 className="mt-4 font-suez text-2xl text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[#99A1AF]">{copy}</p>
      {actionLabel && onAction ? (
        <Button className="mt-5 rounded-[10px] bg-[var(--vh-pink)] px-6 text-white hover:bg-[var(--vh-pink-soft)]" onClick={onAction} type="button">
          {actionLabel}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function PriceLine({
  label,
  amount,
  currency,
  muted,
}: {
  label: string;
  amount?: number | null;
  currency?: string;
  muted?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 text-sm", muted ? "text-[#99A1AF]" : "text-white")}>
      <span>{label}</span>
      <span className="font-semibold">{formatColiveMoney(amount, currency)}</span>
    </div>
  );
}

export function MonthlySummaryCard({
  title,
  property,
  room,
  moveIn,
  duration,
  children,
}: {
  title: string;
  property?: string;
  room?: string;
  moveIn: string;
  duration: number;
  children?: ReactNode;
}) {
  return (
    <aside className="overflow-hidden rounded-[24px] border border-white/12 bg-[var(--vh-panel-strong)] p-5 shadow-[var(--vh-shadow-lg)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--vh-pink)]">Monthly summary</p>
          <h3 className="mt-2 font-suez text-2xl text-white">{title}</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#D1D5DC]">
          {duration} mo
        </span>
      </div>
      <div className="mt-5 grid gap-3 rounded-[18px] bg-white/5 p-4 text-sm text-[#D1D5DC]">
        <div className="flex justify-between gap-4">
          <span>Move-in</span>
          <span className="font-semibold text-white">{formatColiveDate(moveIn)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Property</span>
          <span className="text-right font-semibold text-white">{property || "Select property"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Room</span>
          <span className="text-right font-semibold text-white">{room || "Select room"}</span>
        </div>
      </div>
      {children ? <div className="mt-5 space-y-3">{children}</div> : null}
    </aside>
  );
}
