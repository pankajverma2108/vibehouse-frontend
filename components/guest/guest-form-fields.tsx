"use client";

import type { ComponentProps, ReactNode } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FieldChromeProps = {
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

function FieldChrome({ label, helper, error, children, className }: FieldChromeProps) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">{label}</span>
      {children}
      {error ? <span className="block text-xs leading-5 text-rose-300">{error}</span> : helper ? <span className="block text-xs leading-5 text-[#94a3b8]">{helper}</span> : null}
    </label>
  );
}

export function GuestTextField({
  label,
  helper,
  error,
  className,
  ...props
}: ComponentProps<"input"> & {
  label: string;
  helper?: string;
  error?: string;
}) {
  return (
    <FieldChrome className={className} error={error} helper={helper} label={label}>
      <input
        className="h-12 w-full rounded-[8px] border-2 border-[#334155] bg-[#10131a] px-4 text-sm text-white outline-none transition duration-300 placeholder:text-[#94a3b8]/55 focus:border-[var(--vh-pink)] focus:bg-[#16070c] focus:shadow-[0_0_0_3px_rgba(198,40,40,0.22)]"
        {...props}
      />
    </FieldChrome>
  );
}

export function GuestTextArea({
  label,
  helper,
  error,
  className,
  ...props
}: ComponentProps<"textarea"> & {
  label: string;
  helper?: string;
  error?: string;
}) {
  return (
    <FieldChrome className={className} error={error} helper={helper} label={label}>
      <textarea
        className="min-h-32 w-full resize-y rounded-[8px] border-2 border-[#334155] bg-[#10131a] px-4 py-3 text-sm leading-6 text-white outline-none transition duration-300 placeholder:text-[#94a3b8]/55 focus:border-[var(--vh-pink)] focus:bg-[#16070c] focus:shadow-[0_0_0_3px_rgba(198,40,40,0.22)]"
        {...props}
      />
    </FieldChrome>
  );
}

export function GuestQuantityField({
  label,
  value,
  onDecrease,
  onIncrease,
  helper,
  className,
}: {
  label: string;
  value: number;
  onDecrease?: () => void;
  onIncrease?: () => void;
  helper?: string;
  className?: string;
}) {
  return (
    <FieldChrome className={className} helper={helper} label={label}>
      <div className="flex h-12 items-center justify-between rounded-[8px] border-2 border-[#334155] bg-[#10131a] px-2">
        <Button className="h-8 w-8 rounded-full border border-[var(--vh-pink)]/30 bg-[#16070c] p-0 text-[var(--vh-pink)] hover:bg-[var(--vh-pink)] hover:text-white" onClick={onDecrease} type="button">
          <Minus className="h-4 w-4" />
          <span className="sr-only">Decrease quantity</span>
        </Button>
        <span className="min-w-10 text-center text-sm font-bold text-white">{value}</span>
        <Button className="h-8 w-8 rounded-full border border-[var(--vh-pink)]/30 bg-[#16070c] p-0 text-[var(--vh-pink)] hover:bg-[var(--vh-pink)] hover:text-white" onClick={onIncrease} type="button">
          <Plus className="h-4 w-4" />
          <span className="sr-only">Increase quantity</span>
        </Button>
      </div>
    </FieldChrome>
  );
}
