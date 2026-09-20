"use client";

import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BreakfastTerminalResponse } from "@/lib/breakfast-api";

const terminalCopy: Record<
  BreakfastTerminalResponse["link_state"],
  { label: string; title: string; body: string }
> = {
  disabled: {
    label: "Breakfast unavailable",
    title: "Breakfast isn't available at this property.",
    body: "There is nothing you need to do on this page.",
  },
  checked_out: {
    label: "Ordering closed",
    title: "Your stay has ended.",
    body: "Breakfast ordering is closed for this booking.",
  },
  revoked: {
    label: "Link inactive",
    title: "This link is no longer active.",
    body: "Please use the latest breakfast link shared with your stay.",
  },
  not_found: {
    label: "Invalid link",
    title: "This breakfast link is invalid.",
    body: "Check that you opened the complete link from your WhatsApp message.",
  },
};

export function BreakfastLoadingPanel() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="space-y-8 border-t border-dashed border-[#3D3D3D] py-8"
      role="status"
    >
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded-none bg-white/10 motion-reduce:animate-none" />
        <div className="h-9 w-64 max-w-full animate-pulse rounded-none bg-white/10 motion-reduce:animate-none" />
        <div className="h-5 w-48 animate-pulse rounded-none bg-white/8 motion-reduce:animate-none" />
      </div>
      <div className="space-y-4 border-t border-dashed border-[#3D3D3D] pt-7">
        {[0, 1, 2].map((item) => (
          <div
            className="h-20 animate-pulse rounded-none border border-[#3D3D3D] bg-white/[0.035] motion-reduce:animate-none"
            key={item}
          />
        ))}
      </div>
      <p className="text-sm text-white/64">Checking your breakfast link…</p>
    </section>
  );
}

export function BreakfastErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="border-t border-dashed border-[#3D3D3D] py-10">
      <p className="font-caption text-xs uppercase tracking-[0.12em] text-[#f3c96b]">
        Service unavailable
      </p>
      <h2 className="font-['Cirka',serif] tracking-tight mt-3 text-[26px] leading-tight text-white sm:text-[32px]">
        We couldn&apos;t load your breakfast menu.
      </h2>
      <p className="mt-3 max-w-xl text-base leading-7 text-white/68">{message}</p>
      <Button
        className="mt-6 h-12 rounded-none bg-[#FF2E62] px-5 font-bold text-white border border-[#FF2E62] shadow-[3px_3px_0px_#991438] hover:bg-[#FF426F]"
        onClick={onRetry}
        type="button"
      >
        <RefreshCcw aria-hidden="true" />
        Try again
      </Button>
    </section>
  );
}

export function BreakfastTerminalPanel({
  response,
}: {
  response: BreakfastTerminalResponse;
}) {
  const copy = terminalCopy[response.link_state];

  return (
    <section className="border-t border-dashed border-[#3D3D3D] py-10">
      <p className="font-caption text-xs uppercase tracking-[0.12em] text-[#f3c96b]">
        {copy.label}
      </p>
      <h2 className="font-['Cirka',serif] tracking-tight mt-3 max-w-2xl text-[28px] leading-tight text-white sm:text-[36px]">
        {copy.title}
      </h2>
      <p className="mt-3 max-w-xl text-base leading-7 text-white/68">{copy.body}</p>
    </section>
  );
}
