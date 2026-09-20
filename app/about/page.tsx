"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bed, MapPin, ShieldCheck, Users } from "lucide-react";

import { aboutPillars, aboutStoryBlocks } from "@/content/about";
import { SectionHeading } from "@/components/marketing/widgets/section-heading";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { FadeIn, Stagger, StaggerItem } from "@/components/shared/motion";
import { MagneticButton } from "@/components/marketing/interactive/magnetic-button";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";

const pillarIcons = [Users, Bed, MapPin, ShieldCheck];

export default function AboutPage() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-black pt-32 pb-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-xl mb-6">
              <span className="h-2 w-2 rounded-full bg-[#2FBC81]" />
              <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-white/90">
                The Vibehouse Story
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold uppercase tracking-tight text-white leading-none">
              More Than
              <br />
              <span className="text-[#E01E5A]">Just A Bed.</span>
            </h1>

            <div className="relative mt-6 max-w-xl">
              <div className={`relative overflow-hidden transition-all duration-500 ease-in-out ${expanded ? "max-h-[500px]" : "max-h-32"}`}>
                <div className="space-y-4 text-sm sm:text-base leading-relaxed text-white/75 font-body">
                  <p>
                    Vibehouse was created to bridge the gap between sterile business hotels and uninspiring hostel bunks—offering high-design spaces where ambitious nomads work, rest, and build lasting friendships.
                  </p>
                  <p>
                    From Bangalore&apos;s tech founders to global digital nomads, our properties deliver boutique acoustic pods, 100Mbps dedicated fiber, specialty coffee, and vibrant cultural nights.
                  </p>
                  <p>
                    Every square foot is engineered around three simple principles: deep restorative sleep, frictionless remote productivity, and spontaneous human connection.
                  </p>
                </div>
                {!expanded ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black via-black/80 to-transparent" />
                ) : null}
              </div>
              <button
                className="mt-3 text-xs font-mono font-semibold uppercase tracking-wider text-[#36C5F0] hover:underline cursor-pointer"
                onClick={() => setExpanded((value) => !value)}
                type="button"
              >
                {expanded ? "Collapse Story" : "Read Full Story"}
              </button>
            </div>
          </FadeIn>

          <FadeIn className="overflow-hidden rounded-2xl border border-white/10 bg-[#121216] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.7)]" delay={0.1}>
            <ImageWithFallback
              alt="Vibehouse Koramangala sanctuary"
              className="aspect-[4/3] w-full object-cover rounded-xl"
              src="https://images.unsplash.com/photo-1501566953613-d93d5cb0be93?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200"
            />
          </FadeIn>
        </div>
      </section>

      {/* Story Blocks */}
      <section className="bg-[#060608] py-20 md:py-28 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading subtitle="Architectural Vision" title="How We Built This" />
          <Stagger className="space-y-16 mt-12 max-w-5xl mx-auto">
            {aboutStoryBlocks.map((block, index) => (
              <StaggerItem key={block.title}>
                <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 bg-[#121216] rounded-2xl p-6 sm:p-8 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className={index % 2 === 1 ? "md:order-2" : ""}>
                    <span
                      className="inline-block rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider mb-3 border"
                      style={{
                        backgroundColor: `${block.color}15`,
                        borderColor: `${block.color}35`,
                        color: block.color,
                      }}
                    >
                      Pillar 0{index + 1}
                    </span>
                    <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white mb-4">
                      {block.title}
                    </h2>
                    <p className="text-sm leading-relaxed text-white/70 font-body">{block.body}</p>
                  </div>
                  <div className={index % 2 === 1 ? "md:order-1" : ""}>
                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <ImageWithFallback alt={block.title} className="aspect-video w-full object-cover" src={block.image} />
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Four Core Pillars */}
      <section className="bg-black py-20 md:py-28 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading subtitle="Our Foundations" title="What We Stand For" />
          <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mt-12">
            {aboutPillars.map((pillar, index) => {
              const Icon = pillarIcons[index % pillarIcons.length] ?? Users;
              return (
                <StaggerItem key={pillar.title} className="h-full">
                  <div className="bg-[#121216] p-7 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <div>
                      <div
                        className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border"
                        style={{
                          backgroundColor: `${pillar.color}15`,
                          borderColor: `${pillar.color}35`,
                          color: pillar.color,
                        }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-display font-bold uppercase tracking-tight text-white mb-2">{pillar.title}</h3>
                      <p className="text-xs leading-relaxed text-white/65 font-body">{pillar.description}</p>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* Closing Call to Action */}
      <section className="bg-[#060608] py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <FadeIn className="bg-[#121216] rounded-3xl p-8 sm:p-14 border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[450px] h-[250px] bg-[#E01E5A]/10 blur-[90px] rounded-full" />

            <p className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#2FBC81] mb-3">
              YOUR SOCIAL SANCTUARY
            </p>

            <h2 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-white leading-tight max-w-2xl mx-auto">
              Ready to Experience Vibehouse?
            </h2>

            <p className="mt-4 text-xs sm:text-sm font-body text-white/70 max-w-md mx-auto leading-relaxed">
              Book your private room or acoustic dorm bunk in Koramangala with instant direct confirmation.
            </p>

            <div className="mt-8 flex justify-center">
              <Link href={getDefaultPropertyDestinationHref()}>
                <MagneticButton className="rounded-full bg-[#E01E5A] hover:bg-[#F02D6B] text-white px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_4px_20px_rgba(224,30,90,0.35)]">
                  <span>Explore Rooms &amp; Availability</span>
                  <ArrowRight className="h-4 w-4" />
                </MagneticButton>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
