"use client";

import { useEffect, useState } from "react";
import { EventCard } from "@/components/marketing/event-card";
import MagicBento from "@/components/marketing/magic-bento";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { FadeIn, Stagger, StaggerItem } from "@/components/shared/motion";
import { eventPageContent, pastEventImages, weeklyLineup } from "@/content/events";
import { getPublicEventsResult } from "@/lib/cx-api";
import { usePropertyId } from "@/hooks/use-property-id";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventsPage() {
  const propertyId = usePropertyId();
  const [eventsState, setEventsState] = useState({
    propertyId: "",
    result: { events: [], error: null } as Awaited<ReturnType<typeof getPublicEventsResult>>,
  });
  const eventsResult = propertyId
    ? eventsState.result
    : { events: [], error: "Property ID is required." };
  const isPending = Boolean(propertyId) && eventsState.propertyId !== propertyId;

  useEffect(() => {
    if (!propertyId) {
      return;
    }

    const controller = new AbortController();

    void getPublicEventsResult({ propertyId, signal: controller.signal })
      .then((result) => setEventsState({ propertyId, result }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setEventsState({
            propertyId,
            result: {
              events: [],
              error: error instanceof Error ? error.message : "Events are unavailable right now.",
            },
          });
        }
      });

    return () => controller.abort();
  }, [propertyId]);

  const liveEvents = eventsResult.events;

  const eventGridClass =
    liveEvents.length <= 1
      ? "grid grid-cols-1 gap-6 md:max-w-[460px] md:mx-auto"
      : liveEvents.length === 2
      ? "grid grid-cols-1 gap-6 md:grid-cols-2"
      : "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3";

  return (
    <>
      <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden border-b border-white/10 bg-black pt-28 pb-16">
        <div className="absolute inset-0">
          <ImageWithFallback
            alt="Experiences hero"
            className="h-full w-full object-cover opacity-35"
            src="https://images.unsplash.com/photo-1758179764880-7513421d202a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1400"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/75 to-black" />
        </div>
        <FadeIn className="relative z-10 mx-auto max-w-5xl px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-xl mb-6">
            <span className="h-2 w-2 rounded-full bg-[#E01E5A] animate-pulse" />
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-white/90">
              Live Cultural Calendar
            </span>
          </div>
          <h1 className="leading-none uppercase font-display font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-white">
            <span>Never a Dull</span>{" "}
            <span className="text-[#E01E5A] block sm:inline">Evening.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[660px] text-sm sm:text-base md:text-lg text-white/70 font-body leading-relaxed">
            From sunset rooftop acoustics to founder jam sessions, experience Bangalore&apos;s creative culture alongside international nomads and local artists.
          </p>
        </FadeIn>
      </section>

      <section className="bg-black py-16 md:py-24 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading align="center" subtitle={eventPageContent.upcomingSubtitle} title="This Week" />
          {isPending ? (
            <div aria-busy="true" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-10">
              <span className="sr-only">Current experiences are being prepared.</span>
              {[0, 1, 2].map((item) => (
                <div className="border border-white/10 bg-[#121216] rounded-2xl p-5 space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" key={item}>
                  <Skeleton className="h-[220px] w-full rounded-xl bg-white/5" />
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-2/3 rounded-lg bg-white/5" />
                    <Skeleton className="h-4 w-full rounded-lg bg-white/5" />
                    <Skeleton className="h-4 w-4/5 rounded-lg bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : eventsResult.error ? (
            <FadeIn className="border border-white/10 bg-[#121216] p-8 text-center text-white mt-10 max-w-xl mx-auto rounded-2xl shadow-xl">
              <p className="font-display text-xl font-bold uppercase tracking-wide">Events Lineup Updating</p>
              <p className="mx-auto mt-2 max-w-[500px] text-xs font-body text-white/60">{eventsResult.error}</p>
            </FadeIn>
          ) : liveEvents.length === 0 ? (
            <FadeIn className="border border-white/10 bg-[#121216] p-8 text-center text-white mt-10 max-w-xl mx-auto rounded-2xl shadow-xl">
              <p className="font-display text-xl font-bold uppercase tracking-wide">Next Lineup Announcing Soon</p>
              <p className="mx-auto mt-2 max-w-[500px] text-xs font-body text-white/60">
                Weekly experiences are announced every Monday. Check back soon for the updated Koramangala schedule.
              </p>
            </FadeIn>
          ) : (
            <Stagger className={`${eventGridClass} mt-10`}>
              {liveEvents.map((event) => (
                <StaggerItem key={`${event.title}-${event.date}-${event.time}`}>
                  <EventCard {...event} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
      </section>

      <section className="bg-[#060608] py-16 md:py-24 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading align="center" subtitle={eventPageContent.weeklySubtitle} title="Standard Weekly Experiences" />
          <div className="mt-10">
            <MagicBento
              clickEffect
              disableAnimations={false}
              enableBorderGlow
              enableMagnetism={false}
              enableSpotlight
              enableStars
              enableTilt={false}
              glowColor="255, 46, 98"
              items={weeklyLineup}
              particleCount={12}
              spotlightRadius={400}
              textAutoHide
            />
          </div>
        </div>
      </section>

      <section className="bg-black py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading align="center" subtitle={eventPageContent.pastSubtitle} title="The Memories" />
          <Stagger className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 mt-10">
            {pastEventImages.map((image, index) => (
              <StaggerItem key={image}>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121216] p-2 group shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <ImageWithFallback
                    alt={`Past experience ${index + 1}`}
                    className="aspect-square w-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105"
                    src={image}
                  />
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          <FadeIn className="mt-12 text-center">
            <a
              href="https://instagram.com/vibehouse"
              rel="noreferrer"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] hover:bg-[#E01E5A] text-white border border-white/15 hover:border-[#E01E5A] px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            >
              <span>Follow @vibehouse On Instagram</span>
            </a>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
