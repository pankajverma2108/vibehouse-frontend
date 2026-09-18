"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

import { cn } from "@/lib/utils";

import { ImageWithFallback } from "@/components/shared/image-with-fallback";

type HeroCarouselProps = {
  images: string[];
  titleParts: string[];
};

export function HeroCarousel({ images, titleParts }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) {
      return;
    }

    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    emblaApi.on("select", onSelect);
    const timer = window.setInterval(() => emblaApi.scrollNext(), 5000);

    return () => {
      window.clearInterval(timer);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <>
      <div className="absolute inset-0" ref={emblaRef}>
        <div className="flex h-full">
          {images.map((image, index) => (
            <div key={image} className="relative min-w-0 flex-[0_0_100%]">
              <picture className="block h-full w-full">
                <source
                  sizes="100vw"
                  srcSet={`${image.replace("-1600.webp", "-768.avif")} 768w, ${image.replace("-1600.webp", "-1600.avif")} 1600w`}
                  type="image/avif"
                />
                <source
                  sizes="100vw"
                  srcSet={`${image.replace("-1600.webp", "-768.webp")} 768w, ${image} 1600w`}
                  type="image/webp"
                />
                <ImageWithFallback
                  alt={`The Daily Social hero ${index + 1}`}
                  className="h-full w-full object-cover"
                  fetchPriority={index === 0 ? "high" : "auto"}
                  loading={index === 0 ? "eager" : "lazy"}
                  src={image}
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-[#0D0D0D]" />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 md:bottom-6">
        {images.map((image, index) => (
          <button
            key={image}
            aria-label={`Go to slide ${index + 1}`}
            className={cn(
              "h-1.5 transition-all duration-300",
              index === selectedIndex ? "w-10 bg-[var(--np-yellow)]" : "w-3 bg-white/30 hover:bg-white/60",
            )}
            onClick={() => emblaApi?.scrollTo(index)}
            type="button"
          />
        ))}
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-start px-4 pb-28 pt-32 md:justify-center md:pb-24 md:pt-36">
        <div className="mb-10 mt-16 max-w-[1100px] px-4 md:mt-0 text-center">
          <div className="inline-flex items-center gap-2 border border-white/20 bg-black/60 px-3 py-1 mb-6 backdrop-blur-md">
            <span className="h-1.5 w-1.5 bg-[var(--np-green)] animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/90 font-['Gilroy',sans-serif]">
              LIVE INVENTORY · DIRECT BOOKING
            </span>
          </div>

          <h1 className="text-center uppercase leading-[0.92] text-[46px] sm:text-[72px] md:text-[96px] lg:text-[116px] font-['Cirka',serif] font-black tracking-[-0.02em] select-none text-white">
            <span>
              {titleParts[0]}
            </span>{" "}
            <span className="text-[var(--np-yellow)] drop-shadow-[0_4px_24px_rgba(255,203,69,0.25)]">
              {titleParts[1]}
            </span>
            <br />
            <span>
              {titleParts[2]}
            </span>
          </h1>

          <p className="mt-4 text-center font-['Gilroy',sans-serif] text-xs sm:text-sm font-extrabold uppercase tracking-[0.18em] text-white/70 max-w-[640px] mx-auto">
            VIBRANT SOCIAL HOSTEL, NOMAD SUITES & COMMUNITY IN KORAMANGALA
          </p>
        </div>
      </div>
    </>
  );
}
