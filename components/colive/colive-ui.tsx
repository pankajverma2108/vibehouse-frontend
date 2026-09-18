"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays, ChevronRight, Loader2, ShieldCheck } from "lucide-react";

import { Button as NeoPopButton } from "@/components/neopop/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatColiveDate, formatColiveMoney } from "@/lib/colive-flow-state";

export function ColiveShell({ children }: { children: ReactNode }) {
  return (
    <section className="min-h-screen bg-[#0D0D0D] pb-20 pt-24 text-white md:pb-24 md:pt-28 font-['Gilroy',sans-serif]">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">{children}</div>
    </section>
  );
}

export function SectionHeader({
  badge,
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
      {badge ? (
        <span className="mb-3 inline-block border border-[var(--np-yellow)] bg-[var(--np-yellow)] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-black rounded-none">
          {badge}
        </span>
      ) : null}
      <h1 className="font-['Cirka',serif] text-[32px] leading-[1.08] text-white tracking-tight md:text-[46px]">
        {title}
      </h1>
      {copy ? (
        <p className={cn("mt-4 text-base leading-7 text-white/70 font-['Gilroy',sans-serif]", align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl")}>
          {copy}
        </p>
      ) : null}
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
      <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/60 font-['Gilroy',sans-serif]">
        {label}
      </span>
      <input
        className={cn(
          "mt-2 h-12 w-full rounded-none border bg-[#121212] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--np-yellow)] font-['Gilroy',sans-serif]",
          error ? "border-[#EE4D37]" : "border-[#3D3D3D]",
        )}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? <span className="mt-2 block text-xs font-semibold text-[#EE4D37]">{error}</span> : null}
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
      <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/60 font-['Gilroy',sans-serif]">
        {label}
      </span>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className="mt-2 flex h-12 w-full items-center justify-between rounded-none border border-[#3D3D3D] bg-[#121212] px-4 text-left text-sm text-white hover:border-white/30 transition-colors font-['Gilroy',sans-serif]"
            type="button"
          >
            <span>{formatColiveDate(value)}</span>
            <CalendarDays className="h-4 w-4 text-[var(--np-yellow)]" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="z-[220] w-auto rounded-none border border-[#3D3D3D] bg-[#121212] p-3 text-white shadow-[6px_6px_0px_#000000]">
          <Calendar
            disabled={{ before: new Date() }}
            mode="single"
            className="rounded-none bg-transparent"
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
    <div className="rounded-none border border-[#3D3D3D] bg-[#161616] p-8 text-center shadow-[6px_6px_0px_#000000]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-none border border-[#3D3D3D] bg-[#121212]">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-[var(--np-yellow)]" /> : <ShieldCheck className="h-5 w-5 text-[var(--np-yellow)]" />}
      </div>
      <h2 className="mt-4 font-['Cirka',serif] text-2xl text-white tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-white/70 font-['Gilroy',sans-serif]">{copy}</p>
      {actionLabel && onAction ? (
        <div className="mt-6 flex justify-center">
          <NeoPopButton variant="primary" onClick={onAction}>
            {actionLabel}
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </NeoPopButton>
        </div>
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
    <div className={cn("flex items-center justify-between gap-4 text-sm font-['Gilroy',sans-serif]", muted ? "text-white/50" : "text-white")}>
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
    <aside className="overflow-hidden rounded-none border border-[#3D3D3D] bg-[#161616] p-6 shadow-[6px_6px_0px_#000000] font-['Gilroy',sans-serif]">
      <div className="flex items-start justify-between gap-4 border-b border-dashed border-[#3D3D3D] pb-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--np-yellow)]">Digital Receipt</p>
          <h3 className="mt-1 font-['Cirka',serif] text-2xl text-white tracking-tight">{title}</h3>
        </div>
        <span className="border border-[#3D3D3D] bg-[#121212] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white">
          {duration} mo stay
        </span>
      </div>
      <div className="mt-5 grid gap-3 border border-[#3D3D3D] bg-[#121212] p-4 text-sm text-white/80">
        <div className="flex justify-between gap-4">
          <span className="text-white/50 uppercase tracking-wider text-xs">Move-in</span>
          <span className="font-semibold text-white">{formatColiveDate(moveIn)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/50 uppercase tracking-wider text-xs">Property</span>
          <span className="text-right font-semibold text-white">{property || "Select property"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/50 uppercase tracking-wider text-xs">Room</span>
          <span className="text-right font-semibold text-white">{room || "Select room"}</span>
        </div>
      </div>
      {children ? <div className="mt-5 space-y-3">{children}</div> : null}
    </aside>
  );
}
