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
              <ImageWithFallback
                alt={`The Daily Social hero ${index + 1}`}
                className="h-full w-full object-cover"
                src={image}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[rgba(35,15,20,0.65)] to-[rgba(35,15,20,0.92)]" />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-2 md:bottom-4">
        {images.map((image, index) => (
          <button
            key={image}
            aria-label={`Go to slide ${index + 1}`}
            className={cn(
              "h-2 rounded-full",
              index === selectedIndex ? "w-8 bg-[var(--vh-pink)]" : "w-2 bg-white/50",
            )}
            onClick={() => emblaApi?.scrollTo(index)}
            type="button"
          />
        ))}
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-start px-4 pb-28 pt-32 md:justify-center md:pb-24 md:pt-36">
        <div className="mb-12 mt-16 max-w-[1000px] px-4 md:mt-0">
          <h1 className="vh-title font-['Suez_One'] text-center text-[52px] uppercase leading-[0.92] md:text-[88px] lg:text-[108px]">
            <span className="bg-gradient-to-r from-white via-slate-100 to-white bg-clip-text text-transparent">
              {titleParts[0]}
            </span>{" "}
            <span className="animate-pulse bg-gradient-to-r from-[var(--vh-pink)] via-[var(--vh-pink-soft)] to-[var(--vh-pink)] bg-clip-text text-transparent">
              {titleParts[1]}
            </span>
            <br />
            <span className="bg-gradient-to-r from-white via-slate-100 to-white bg-clip-text text-transparent">
              {titleParts[2]}
            </span>
          </h1>
        </div>
      </div>
    </>
  );
}
