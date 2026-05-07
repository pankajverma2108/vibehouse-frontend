"use client";

import { Button } from "@/components/ui/button";

export default function GuestError({ reset }: { reset: () => void }) {
  return (
    <section className="min-h-screen bg-[#07070a] pb-20 pt-28 font-['Geologica'] text-white">
      <div className="mx-auto w-full max-w-3xl px-4 text-center md:px-6">
        <div className="rounded-[8px] border-2 border-[var(--vh-pink)]/55 bg-[#16070c] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.32)] md:p-8">
          <h1 className="font-['Geologica'] text-[34px] font-black uppercase leading-9 tracking-[-0.04em] text-white">Guest hub did not load</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#94a3b8]">Refresh this route and keep the current stay context intact.</p>
          <Button className="mt-6 h-10 rounded-[4px] bg-[var(--vh-pink)] px-5 font-black uppercase text-white hover:bg-[var(--vh-pink-soft)]" onClick={reset} type="button">
            Try again
          </Button>
        </div>
      </div>
    </section>
  );
}
