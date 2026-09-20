"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ShieldCheck, Wifi, Coffee, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";

type HeroCarouselProps = {
  images: string[];
  titleParts: string[];
  children?: React.ReactNode;
};

export function HeroCarousel({ images, titleParts, children }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 35 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    emblaApi.on("select", onSelect);
    const timer = window.setInterval(() => emblaApi.scrollNext(), 6000);

    return () => {
      window.clearInterval(timer);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between overflow-hidden bg-black">
      {/* Background Architectural Imagery - Stable & High Performance */}
      <div className="absolute inset-0 z-0" ref={emblaRef}>
        <div className="flex h-full">
          {images.map((image, index) => (
            <div key={image} className="relative min-w-0 flex-[0_0_100%] h-full">
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
                  alt={`Vibehouse boutique sanctuary ${index + 1}`}
                  className="h-full w-full object-cover object-center"
                  fetchPriority={index === 0 ? "high" : "auto"}
                  loading={index === 0 ? "eager" : "lazy"}
                  src={image}
                />
              </picture>

              {/* Multi-layered Nocturnal Vignette fading to Pure Black */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/80" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.85)_100%)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Hero Content Container */}
      <div className="relative z-20 flex flex-1 flex-col justify-between items-center px-4 sm:px-6 pt-32 sm:pt-36 pb-12 sm:pb-16 text-center max-w-[1320px] mx-auto w-full">
        {/* Nudge-Style Live Status Eyebrow Pill */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-xl shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2FBC81] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2FBC81]" />
          </span>
          <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-white/90">
            KORAMANGALA, BANGALORE · BOUTIQUE SOCIAL HUB
          </span>
        </div>

        {/* Main Grand Display Headline */}
        <div className="my-auto py-6 max-w-5xl">
          <h1 className="uppercase leading-[0.95] text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight select-none text-white">
            <span>{titleParts[0]}</span>{" "}
            <span className="text-[#E01E5A]">
              {titleParts[1]}
            </span>
            <br />
            <span className="text-white/90">{titleParts[2]}</span>
          </h1>

          <p className="mt-5 text-center font-body text-sm sm:text-base md:text-lg text-white/70 max-w-[620px] mx-auto leading-relaxed">
            Where high-energy community meets boutique rest. Private balcony suites, acoustic dorm pods, 100Mbps dedicated fiber, and rooftop culture.
          </p>
        </div>

        {/* Floating Booking Strip Slot & Trust Badges */}
        <div className="w-full max-w-[680px] pt-2 space-y-4">
          {children}

          {/* 4-Point Hospitality Trust Strip (Bloom & GoStops inspired, zero emojis) */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] font-mono font-medium text-white/60 pt-2">
            <span className="inline-flex items-center gap-1.5 text-white/75">
              <ShieldCheck className="h-3.5 w-3.5 text-[#2FBC81]" />
              Instant Confirmation
            </span>
            <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-white/20" />
            <span className="inline-flex items-center gap-1.5 text-white/75">
              <Wifi className="h-3.5 w-3.5 text-[#36C5F0]" />
              100Mbps Dedicated Fiber
            </span>
            <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-white/20" />
            <span className="inline-flex items-center gap-1.5 text-white/75">
              <Coffee className="h-3.5 w-3.5 text-[#ECB22E]" />
              Rooftop Cafe &amp; Bar
            </span>
            <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-white/20" />
            <span className="inline-flex items-center gap-1.5 text-white/75">
              <Star className="h-3.5 w-3.5 text-[#ECB22E] fill-[#ECB22E]" />
              4.9/5 Guest Rating
            </span>
          </div>
        </div>

        {/* Floating Slide Indicator Capsule (Bottom Right) */}
        <div className="absolute bottom-6 right-6 md:right-10 z-30 flex items-center gap-2 bg-[#121216]/80 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
          {images.map((image, index) => (
            <button
              key={image}
              aria-label={`Go to slide ${index + 1}`}
              className={cn(
                "h-1 rounded-full transition-all duration-300 cursor-pointer",
                index === selectedIndex
                  ? "w-6 bg-[#E01E5A] shadow-[0_0_8px_rgba(224,30,90,0.6)]"
                  : "w-2 bg-white/30 hover:bg-white/60"
              )}
              onClick={() => emblaApi?.scrollTo(index)}
              type="button"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
