"use client";

import Link from "next/link";
import { useState } from "react";

import { aboutPillars, aboutStoryBlocks } from "@/content/about";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { FadeIn, Stagger, StaggerItem } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";

export default function AboutPage() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <section className="vh-section pt-28 md:pt-32">
        <div className="vh-container grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <FadeIn>
            <h1 className="vh-retro-3d mt-6 font-['Suez_One'] text-[3rem] leading-none md:text-[5.5rem] lg:text-[6.5rem]">
              More than
              <br />
              just a bed.
            </h1>
            <div className="relative mt-6 max-w-3xl">
              <div className={`relative overflow-hidden transition-all duration-500 ease-in-out ${expanded ? "max-h-[420px]" : "max-h-32"}`}>
                <div className="space-y-4 text-base leading-7 text-white/88">
                  <p>
                    The Daily Social started with a simple idea: travel should bring people together. Not just to share a room, but to share experiences, stories, and lasting friendships.
                  </p>
                  <p>
                    Today we are building spaces for backpackers, digital nomads, and curious city explorers who want design, community, and comfort in the same place.
                  </p>
                  <p>
                    We focus on simple hospitality, memorable common areas, and a strong point of view about what a social stay should feel like from the moment you walk in.
                  </p>
                </div>
                {!expanded ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--vh-section-a)] via-[var(--vh-section-a)]/80 to-transparent" />
                ) : null}
              </div>
              <button
                className="mt-2 text-sm underline transition-colors hover:text-[var(--vh-cyan)]"
                onClick={() => setExpanded((value) => !value)}
                type="button"
              >
                {expanded ? "View Less" : "View More"}
              </button>
            </div>
          </FadeIn>

          <FadeIn className="overflow-hidden rounded-[18px]" delay={0.1}>
            <ImageWithFallback
              alt="The Daily Social building"
              className="aspect-[4/3] w-full object-cover"
              src="https://images.unsplash.com/photo-1501566953613-d93d5cb0be93?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200"
            />
          </FadeIn>
        </div>
      </section>

      <section className="vh-section vh-section-alt">
        <div className="vh-container max-w-screen-lg">
          <SectionHeading subtitle="how we got here" title="The Daily Social Story" />
          <Stagger className="space-y-12">
            {aboutStoryBlocks.map((block, index) => (
              <StaggerItem key={block.title}>
                <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
                  <div className={index % 2 === 1 ? "md:order-2" : ""}>
                    <h3 className="text-2xl font-bold uppercase" style={{ color: block.color }}>
                      {block.title}
                    </h3>
                    <p className="mt-4 text-base leading-7 text-white/88">{block.body}</p>
                  </div>
                  <div className={index % 2 === 1 ? "md:order-1" : ""}>
                    <div className="overflow-hidden rounded-[18px]">
                      <ImageWithFallback alt={block.title} className="aspect-video w-full object-cover" src={block.image} />
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="vh-section">
        <div className="vh-container">
          <SectionHeading subtitle="our four pillars" title="What We Stand For" />
          <Stagger className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {aboutPillars.map((pillar) => (
              <StaggerItem key={pillar.title}>
                <div>
                  <div
                    className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${pillar.color}20`, color: pillar.color }}
                  >
                    <span className="text-xs font-bold uppercase">Vibe</span>
                  </div>
                  <h3 className="text-xl font-bold uppercase text-white">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/78">{pillar.description}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="vh-section bg-gradient-to-br from-[var(--vh-pink)] via-[var(--vh-pink-soft)] to-[var(--vh-pink)]">
        <div className="vh-container text-center">
          <h2 className="text-5xl font-bold uppercase leading-tight text-white md:text-7xl">
            Ready to Find
            <br />
            Your Vibe?
          </h2>
          <p className="mx-auto mt-6 max-w-[640px] text-lg italic text-white">
            Join thousands of travelers who have made The Daily Social their home away from home.
          </p>
          <Button asChild className="mt-10 bg-white text-[var(--vh-pink)] hover:translate-y-[-2px] hover:bg-[#ffe8e8] hover:text-[#8e1b1b]" size="lg" variant="secondary">
            <Link href={getDefaultPropertyDestinationHref()}>Search Availability</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
