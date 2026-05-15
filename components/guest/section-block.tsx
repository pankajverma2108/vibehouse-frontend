import type { ReactNode } from "react";

import { StickerTag } from "@/components/shared/sticker-tag";
import type { GuestStickerTagConfig } from "@/components/guest/guest-sticker-tags";
import { cn } from "@/lib/utils";

type SectionBlockProps = {
  title: string;
  description?: string;
  sticker?: GuestStickerTagConfig;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionBlock({
  title,
  description,
  sticker,
  action,
  children,
  className,
}: SectionBlockProps) {
  return (
    <section className={cn("space-y-5 py-2 md:py-3", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          {sticker ? (
            <StickerTag
              bg={sticker.bg}
              className="px-3 py-1.5 text-[11px] font-black not-italic uppercase"
              label={sticker.label}
              rotate={sticker.rotate}
              text={sticker.text}
            />
          ) : null}
          <h2 className="font-sectiontitle mt-3 text-[24px] leading-tight text-[#f8fafc] md:text-[34px]">
            {title}
          </h2>
          {description ? <p className="mt-2 text-sm leading-6 text-[#94a3b8] md:text-base md:leading-7">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div> : null}
      </div>

      {children}
    </section>
  );
}
