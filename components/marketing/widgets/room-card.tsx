"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { RoomCardProps } from "@/content/types";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { Button as NeoPopButton } from "@/components/neopop";
import { cn } from "@/lib/utils";

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

  return (
    <div className="flex flex-col border border-[#3D3D3D] bg-[#161616] shadow-[4px_4px_0px_#000000] hover:border-white/40 transition-colors h-full">
      <div className="relative h-[240px] w-full overflow-hidden border-b border-[#3D3D3D] bg-black">
        <ImageWithFallback
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          src={activeImage}
        />

        {gallery.length > 1 ? (
          <>
            <button
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 border border-white/30 bg-black/70 p-1.5 text-white/90 hover:border-white transition-colors cursor-pointer"
              onClick={goPrevious}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 border border-white/30 bg-black/70 p-1.5 text-white/90 hover:border-white transition-colors cursor-pointer"
              onClick={goNext}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}

        {badge && badge.label.toLowerCase() !== "details on arrival" ? (
          <div className="absolute left-3 top-3 border border-black bg-[var(--np-yellow)] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-black">
            {badge.label}
          </div>
        ) : null}

        {gallery.length > 1 ? (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 border border-white/20 bg-black/70 px-2 py-1">
            {gallery.map((item, index) => (
              <button
                key={`${item}-${index}`}
                aria-label={`Show image ${index + 1}`}
                className={cn(
                  "h-1.5 transition-all",
                  index === activeImageIndex ? "w-4 bg-[var(--np-yellow)]" : "w-1.5 bg-white/40"
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

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-['Gilroy',sans-serif] text-xl font-extrabold uppercase tracking-[0.06em] text-white">
          {title}
        </h3>

        <ul className="mt-3.5 flex flex-wrap gap-1.5 text-xs">
          {detailLabels.slice(0, 8).map((feature, index) => (
            <li
              key={`${feature}-${index}`}
              className="inline-flex items-center border border-[#3D3D3D] bg-[#121212] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white/75 font-['Gilroy',sans-serif]"
            >
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-6 pt-4 border-t border-[#3D3D3D] flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50 font-['Gilroy',sans-serif]">
              {price.includes("/night") ? "Per Night" : "Starting From"}
            </p>
            <p className="text-xl font-extrabold text-[var(--np-yellow)] font-['Gilroy',sans-serif] mt-0.5">
              {price}
            </p>
          </div>

          <NeoPopButton asChild size="sm" variant="primary">
            <Link href={href}>View Room</Link>
          </NeoPopButton>
        </div>
      </div>
    </div>
  );
}
