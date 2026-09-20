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
import { Button as NeoPopButton } from "@/components/neopop";

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
      <section className="relative flex min-h-[65vh] items-center justify-center overflow-hidden border-b border-white/10 bg-[#0A0A0E] pt-24">
        <div className="absolute inset-0">
          <ImageWithFallback
            alt="Experiences hero"
            className="h-full w-full object-cover opacity-45"
            src="https://images.unsplash.com/photo-1758179764880-7513421d202a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1400"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-[#0A0A0E]" />
        </div>
        <FadeIn className="relative z-10 mx-auto max-w-5xl px-4 py-20 text-center">
          <span className="inline-block bg-[var(--vh-pink)] text-white px-3.5 py-1 text-xs font-black uppercase tracking-[0.16em] font-['Gilroy',sans-serif] mb-6 shadow-[2px_2px_0px_#000000]">
            Every Night is an Adventure
          </span>
          <h1 className="leading-tight">
            <span className="font-['Cirka',serif] font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white tracking-tight block">
              Never a Dull
            </span>
            <span className="font-['Cirka',serif] font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-[var(--vh-pink)] tracking-tight block mt-2">
              Evening.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-[700px] text-sm sm:text-base md:text-lg text-white/70 font-['Gilroy',sans-serif] leading-relaxed">
            From pub crawls to game nights, meet travelers from around the world and create memories that outlast the checkout date.
          </p>
        </FadeIn>
      </section>

      <section className="bg-[#0A0A0E] py-16 md:py-20 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading align="center" subtitle={eventPageContent.upcomingSubtitle} title="This Week" />
          {isPending ? (
            <div aria-busy="true" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-10">
              <span className="sr-only">Current experiences are being prepared.</span>
              {[0, 1, 2].map((item) => (
                <div className="border border-white/12 bg-[#171822] shadow-[3px_3px_0px_#000000] rounded-none" key={item}>
                  <Skeleton className="h-[220px] w-full rounded-none bg-[#222222]" />
                  <div className="space-y-3 p-5">
                    <Skeleton className="h-6 w-2/3 rounded-none bg-[#222222]" />
                    <Skeleton className="h-4 w-full rounded-none bg-[#222222]" />
                    <Skeleton className="h-4 w-4/5 rounded-none bg-[#222222]" />
                  </div>
                </div>
              ))}
            </div>
          ) : eventsResult.error ? (
            <FadeIn className="border border-dashed border-white/15 bg-[#12131A] p-8 text-center text-white mt-10 max-w-2xl mx-auto shadow-[4px_4px_0px_#000000]">
              <p className="font-['Cirka',serif] text-2xl font-bold">Events did not load</p>
              <p className="mx-auto mt-2 max-w-[560px] text-xs font-['Gilroy',sans-serif] text-white/60">{eventsResult.error}</p>
            </FadeIn>
          ) : liveEvents.length === 0 ? (
            <FadeIn className="border border-dashed border-white/15 bg-[#12131A] p-8 text-center text-white mt-10 max-w-2xl mx-auto shadow-[4px_4px_0px_#000000]">
              <p className="font-['Cirka',serif] text-2xl font-bold">No upcoming events</p>
              <p className="mx-auto mt-2 max-w-[560px] text-xs font-['Gilroy',sans-serif] text-white/60">
                No events are scheduled right now. Check back soon for the next lineup!
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

      <section className="bg-[#0D0E15] py-16 md:py-20 border-b border-white/10">
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

      <section className="bg-[#0A0A0E] py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading align="center" subtitle={eventPageContent.pastSubtitle} title="The Memories" />
          <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 mt-10">
            {pastEventImages.map((image, index) => (
              <StaggerItem key={image}>
                <div className="overflow-hidden border border-white/12 shadow-[3px_3px_0px_#000000] bg-[#171822] group">
                  <ImageWithFallback
                    alt={`Past experience ${index + 1}`}
                    className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={image}
                  />
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          <FadeIn className="mt-12 text-center">
            <NeoPopButton asChild size="lg" variant="primary">
              <a
                href="https://instagram.com/vibehouse"
                rel="noreferrer"
                target="_blank"
                className="font-['Gilroy',sans-serif] font-black uppercase tracking-[0.12em]"
              >
                Follow on Instagram
              </a>
            </NeoPopButton>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
