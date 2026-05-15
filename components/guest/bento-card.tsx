"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { StickerTag } from "@/components/shared/sticker-tag";
import { Button } from "@/components/ui/button";
import type { GuestStickerTagConfig } from "@/components/guest/guest-sticker-tags";
import { cn } from "@/lib/utils";

type BentoCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  sticker?: GuestStickerTagConfig;
  ctaLabel?: string;
  href?: string;
  children?: ReactNode;
  className?: string;
};

export function BentoCard({
  title,
  description,
  icon: Icon,
  sticker,
  ctaLabel,
  href,
  children,
  className,
}: BentoCardProps) {
  return (
    <motion.article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[8px] border border-dashed border-[rgba(255,255,255,0.28)] bg-[#07070a] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)] transition-colors duration-300 hover:border-[var(--vh-pink)]/55 md:p-6",
        className,
      )}
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.36, ease: "easeOut" }}
      viewport={{ once: true, margin: "-10%" }}
      whileHover={{ y: -3 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-[8px] border border-[var(--vh-pink)]/30 bg-[rgba(198,40,40,0.12)] text-[#f9cb37] shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
          <Icon className="h-5 w-5" />
        </div>
        {sticker ? (
          <StickerTag
            bg={sticker.bg}
            className="relative z-10 px-3 py-1.5 text-[10px] font-black not-italic uppercase"
            label={sticker.label}
            rotate={sticker.rotate}
            text={sticker.text}
          />
        ) : null}
      </div>

      <div className="relative z-10 mt-5 flex flex-1 flex-col">
        <h3 className="font-sectiontitle text-[20px] leading-7 text-white md:text-[22px]">{title}</h3>
        <p className="mt-2 text-sm font-medium leading-6 text-[#cbd5e1]">{description}</p>
        {children ? <div className="mt-5">{children}</div> : null}
      </div>

      {href && ctaLabel ? (
        <Button asChild className="relative z-10 mt-6 h-10 rounded-[4px] bg-[var(--vh-pink)] px-4 font-black uppercase text-white hover:bg-[var(--vh-pink-soft)]">
          <Link href={href}>
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ) : null}
    </motion.article>
  );
}
