import type { Metadata } from "next";
import Link from "next/link";

import { StickerTag } from "@/components/shared/sticker-tag";
import { getBreakfastTestScenarios } from "@/lib/breakfast-preview";

export const metadata: Metadata = {
  title: "Breakfast UI Preview",
  description: "Safe breakfast ordering scenarios for design and acceptance testing.",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function BreakfastPreviewIndexPage() {
  return (
    <main className="min-h-[100dvh] bg-[#07070a] px-4 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-[900px]">
        <StickerTag bg="#FEF08A" className="px-3 py-1.5 text-[10px] font-black not-italic tracking-[0.1em]" label="DESIGN PREVIEW" rotate="-rotate-[2deg]" text="#230f14" />
        <h1 className="font-sectiontitle mt-5 text-pretty text-[38px] leading-tight text-white sm:text-[52px]">Breakfast test links</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white/64">These links use test data and do not save orders. Review Order opens the receipt, and Confirm Order shows the final state.</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {getBreakfastTestScenarios().map((scenario) => (
            <Link className="group min-w-0 rounded-[14px] border border-white/13 bg-white/[0.025] px-5 py-5 transition-colors hover:border-white/30 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c96b]" href={`/breakfast/${scenario.token}`} key={scenario.token}>
              <h2 className="break-words text-lg font-bold text-white">{scenario.label}</h2>
              <p className="mt-2 break-words text-sm leading-6 text-white/58">{scenario.description}</p>
              <p className="mt-4 break-all text-xs font-bold text-[#f3c96b]">/breakfast/{scenario.token}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
