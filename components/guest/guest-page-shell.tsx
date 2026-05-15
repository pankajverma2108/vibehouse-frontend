import type { ReactNode } from "react";

import { StickerTag } from "@/components/shared/sticker-tag";
import type { GuestStickerTagConfig } from "@/components/guest/guest-sticker-tags";
import { cn } from "@/lib/utils";

type GuestPageShellProps = {
  title?: string;
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
        "relative isolate min-h-screen overflow-x-clip bg-[#07070a] font-['Geologica'] text-white",
        className,
      )}
    >
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.028)_1px,transparent_1px)] bg-[size:88px_88px] opacity-30" />
      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-col gap-7 px-4 pb-0 pt-5 md:px-6 md:pt-7 xl:px-0">
        {title || description || sticker || actions ? (
          <header className="flex flex-col items-center gap-4 pt-8 text-center md:pt-10">
            {sticker ? (
              <StickerTag
                bg={sticker.bg}
                className="px-3 py-1.5 text-[11px] font-black not-italic uppercase"
                label={sticker.label}
                rotate={sticker.rotate}
                text={sticker.text}
              />
            ) : null}
            {title || description ? (
              <div className="max-w-3xl">
                {title ? <h1 className="vh-title text-center text-[28px] leading-[1.08] text-white md:text-[34px]">{title}</h1> : null}
                {description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-[#cbd5e1] md:text-base">{description}</p> : null}
              </div>
            ) : null}
            {actions ? <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
          </header>
        ) : null}

        {children}
      </div>
    </section>
  );
}
