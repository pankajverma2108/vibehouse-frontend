import type { ReactNode } from "react";

import { StickerTag } from "@/components/shared/sticker-tag";
import type { GuestStickerTagConfig } from "@/components/guest/guest-sticker-tags";
import { cn } from "@/lib/utils";

type GuestPageShellProps = {
  title: string;
  description?: string;
  sticker?: GuestStickerTagConfig;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function GuestPageShell({
  title,
  description,
  sticker,
  actions,
  children,
  className,
}: GuestPageShellProps) {
  return (
    <section
      className={cn(
        "relative min-h-screen overflow-hidden bg-[#07070a] pb-28 pt-24 font-['Geologica'] text-white md:pb-16 md:pt-28",
        className,
      )}
    >
      <div className="pointer-events-none absolute -left-24 top-[18rem] h-80 w-44 rounded-full bg-[var(--vh-pink)]/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-[14rem] h-96 w-52 rounded-full bg-[var(--vh-hot)]/10 blur-3xl" />
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-7 px-4 md:px-6 xl:px-0">
        <header className="flex flex-col items-center gap-4 text-center">
          {sticker ? (
            <StickerTag
              bg={sticker.bg}
              className="px-3 py-1.5 text-[11px] font-black not-italic uppercase tracking-[0.12em]"
              label={sticker.label}
              rotate={sticker.rotate}
              text={sticker.text}
            />
          ) : null}
          <div className="max-w-3xl">
            <h1 className="vh-title text-center text-[28px] leading-[1.08] text-white md:text-[34px]">
              {title}
            </h1>
            {description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-[#94a3b8] md:text-base">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
        </header>

        {children}
      </div>
    </section>
  );
}
