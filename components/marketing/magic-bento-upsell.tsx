"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";

type BentoItem = {
  id: string;
  title: string;
  body: string;
  kicker: string;
  tone: "pink" | "blue" | "green";
  colSpan?: string;
};

type MagicBentoUpsellProps = {
  title: string;
  subtitle: string;
  items: BentoItem[];
};

export function MagicBentoUpsell({ title, subtitle, items }: MagicBentoUpsellProps) {
  const visibleItems = items.slice(0, 6);

  const tileLayout = [
    "md:col-span-3 md:row-span-1",
    "md:col-span-3 md:row-span-1",
    "md:col-span-6 md:row-span-2",
    "md:col-span-4 md:row-span-2",
    "md:col-span-2 md:row-span-1",
    "md:col-span-2 md:row-span-1",
  ];

  return (
    <div className="vh-container">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="vh-kicker text-[var(--vh-cyan)]">Add-ons</p>
          <h2 className="vh-title font-biorhyme">{title}</h2>
          <p className="mt-1 text-sm text-white/75">{subtitle}</p>
        </div>
      </div>

      <motion.div
        className="grid auto-rows-[154px] grid-cols-2 gap-3 md:grid-cols-6 md:auto-rows-[126px] md:gap-4"
        initial="hidden"
        viewport={{ once: true, margin: "-12%" }}
        whileInView="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
        }}
      >
        {visibleItems.map((item, index) => (
          <motion.div
            key={item.id}
            className={tileLayout[index]}
            variants={{ hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{ y: -4, scale: 1.01 }}
          >
            <div className="vh-bento-tile h-full rounded-[22px] p-5">
              <div className="flex h-full flex-col justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/64">{item.kicker}</p>
                <div>
                  <h3 className="font-sora text-[28px] font-semibold leading-[1.04] text-white md:text-[34px]">{item.title}</h3>
                  <p className="mt-1 max-w-[28ch] text-sm leading-6 text-white/76">{item.body}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        <motion.div
          className="col-span-2 md:col-span-2 md:row-span-2"
          variants={{ hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          whileHover={{ y: -5, scale: 1.01 }}
        >
          <div className="vh-bento-tile h-full rounded-[22px] p-5">
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/64">Featured Upsell</p>
                <h3 className="mt-2 font-sora text-[30px] font-semibold leading-[1.05] text-white">Night Vibe Pack</h3>
                <p className="mt-2 text-sm leading-6 text-white/76">
                  Includes welcome drink, event pass, late checkout hold, and laundry credits.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href={getDefaultPropertyDestinationHref()}>Add to Booking</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
