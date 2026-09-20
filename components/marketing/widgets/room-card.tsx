"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

import type { RoomCardProps } from "@/content/types";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { cn } from "@/lib/utils";
import { MagneticButton } from "../interactive/magnetic-button";

export function RoomCard({
  amenitiesLegend,
  badge,
  features,
  href,
  image,
  images,
  price,
  title,
}: RoomCardProps) {
  const gallery = images && images.length > 0 ? images : [image];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const activeImage = gallery[activeImageIndex] ?? gallery[0] ?? image;
  const detailLabels = Array.from(new Set([...(features ?? []), ...(amenitiesLegend ?? [])]));

  const goPrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((current) => (current - 1 + gallery.length) % gallery.length);
  };

  const goNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((current) => (current + 1) % gallery.length);
  };

  const isDorm = title.toLowerCase().includes("bunk") || title.toLowerCase().includes("dorm") || title.toLowerCase().includes("pod");

  return (
    <div className="group flex flex-col bg-[#121216] rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.7)] h-full">
      {/* Room Photography */}
      <div className="relative h-[250px] w-full overflow-hidden bg-[#0A0A0E]">
        <ImageWithFallback
          alt={title}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          src={activeImage}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121216] via-transparent to-black/30" />

        {gallery.length > 1 ? (
          <>
            <button
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90 hover:bg-black/90 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              onClick={goPrevious}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90 hover:bg-black/90 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              onClick={goNext}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}

        {badge && badge.label.toLowerCase() !== "details on arrival" ? (
          <div
            className={cn(
              "absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-mono font-medium uppercase tracking-wider text-white shadow-md",
              isDorm ? "bg-[#36C5F0]/90 text-black font-semibold" : "bg-[#E01E5A] text-white"
            )}
          >
            {badge.label}
          </div>
        ) : null}

        {gallery.length > 1 ? (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 border border-white/15">
            {gallery.map((item, index) => (
              <button
                key={`${item}-${index}`}
                aria-label={`Show image ${index + 1}`}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  index === activeImageIndex ? "w-4 bg-[#E01E5A]" : "w-1 bg-white/40"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveImageIndex(index);
                }}
                type="button"
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Room Details & Pricing */}
      <div className="p-6 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-display text-xl font-bold uppercase tracking-tight text-white group-hover:text-white transition-colors">
            {title}
          </h3>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {detailLabels.slice(0, 6).map((feature, index) => (
              <span
                key={`${feature}-${index}`}
                className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-mono font-medium uppercase tracking-wider text-white/70 bg-white/[0.04] border border-white/8"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono font-medium uppercase tracking-wider text-white/50">
              {price.includes("/night") ? "Per Night" : "Starting From"}
            </p>
            <p className="text-xl font-mono font-bold text-white mt-0.5 tracking-tight">
              {price}
            </p>
          </div>

          <Link href={href}>
            <MagneticButton className="rounded-full bg-white/[0.08] hover:bg-[#E01E5A] text-white hover:text-white border border-white/15 hover:border-[#E01E5A] px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5">
              <span>View Space</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </MagneticButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
