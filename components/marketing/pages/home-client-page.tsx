"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { HeroCarousel } from "@/components/marketing/widgets/hero-carousel";
import { BookingWidget } from "@/components/marketing/widgets/booking-widget";
import { upcomingEvents as staticEvents } from "@/content/events";
import { heroImages, homePageContent } from "@/content/home";
import { rooms as staticRooms } from "@/content/rooms";
import type { EventCardProps, RoomCardProps } from "@/content/types";
import { usePropertyId } from "@/hooks/use-property-id";
import {
  getDefaultPropertyDestinationHref,
  getPublicEventsResult,
  getRoomAvailabilitySnapshot,
  roomTypesToHomeCards,
} from "@/lib/cx-api";

const HomeSections = dynamic(
  () => import("@/components/marketing/pages/home-sections").then((mod) => mod.HomeSections),
  {
    loading: () => (
      <div aria-busy="true" className="min-h-[400px] max-w-7xl mx-auto px-4 sm:px-6 py-24 grid grid-cols-1 md:grid-cols-3 gap-8">
        <span className="sr-only">Experience sections are loading.</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-[#121216] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="h-52 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-6 w-2/3 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-4 w-full rounded-lg bg-white/5 animate-pulse" />
            <div className="h-10 w-full rounded-xl bg-white/5 animate-pulse mt-4" />
          </div>
        ))}
      </div>
    ),
  },
);

type HomeContentState = {
  eventError: string | null;
  events: EventCardProps[];
  roomError: string | null;
  rooms: RoomCardProps[];
  key: string;
};

const initialContent: HomeContentState = {
  eventError: null,
  events: staticEvents.slice(0, 3),
  roomError: null,
  rooms: staticRooms.slice(0, 3),
  key: "",
};

export function HomeClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkin = searchParams.get("checkin")?.trim() || "";
  const checkout = searchParams.get("checkout")?.trim() || "";
  const explicitPropertyId = searchParams.get("property_id")?.trim() || "";
  const propertyId = usePropertyId(explicitPropertyId);
  const [content, setContent] = useState<HomeContentState>(initialContent);
  const requestKey = `${propertyId}:${checkin}:${checkout}`;
  const hasRequiredParams = Boolean(checkin && checkout && explicitPropertyId && propertyId);
  const isPending = hasRequiredParams && content.key !== requestKey;
  const propertyDestinationHref = useMemo(
    () => getDefaultPropertyDestinationHref(propertyId),
    [propertyId],
  );

  useEffect(() => {
    if (checkin && checkout && explicitPropertyId && propertyId) {
      return;
    }

    router.replace(getDefaultPropertyDestinationHref(propertyId, "/"));
  }, [checkin, checkout, explicitPropertyId, propertyId, router]);

  useEffect(() => {
    if (!checkin || !checkout || !explicitPropertyId || !propertyId) {
      return;
    }

    const controller = new AbortController();
    async function loadContent() {
      try {
        const [snapshot, eventsResult] = await Promise.all([
          getRoomAvailabilitySnapshot({
            propertyId,
            checkin,
            checkout,
            signal: controller.signal,
          }),
          getPublicEventsResult({ propertyId, limit: 3, signal: controller.signal }),
        ]);

        const liveRooms = roomTypesToHomeCards(snapshot.roomTypes, { destinationHref: propertyDestinationHref });
        const resolvedRooms = liveRooms.length > 0 ? liveRooms : staticRooms.slice(0, 3);
        const resolvedEvents = eventsResult.events.length > 0 ? eventsResult.events : staticEvents.slice(0, 3);

        setContent({
          eventError: null,
          events: resolvedEvents,
          key: requestKey,
          roomError: null,
          rooms: resolvedRooms,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setContent({
          eventError: null,
          events: staticEvents.slice(0, 3),
          key: requestKey,
          roomError: null,
          rooms: staticRooms.slice(0, 3),
        });
      }
    }

    void loadContent();
    return () => controller.abort();
  }, [checkin, checkout, explicitPropertyId, propertyDestinationHref, propertyId, requestKey]);

  return (
    <>
      <section className="relative w-full overflow-hidden">
        <HeroCarousel images={heroImages} titleParts={homePageContent.heroTitle}>
          <BookingWidget
            destinationHref={propertyDestinationHref}
            initialCheckIn={checkin || undefined}
            initialCheckOut={checkout || undefined}
            submitLabel="Check Availability"
            variant="hero"
          />
        </HeroCarousel>
      </section>

      <HomeSections
        eventError={content.eventError}
        eventsPending={isPending}
        homeEvents={content.events}
        homeRooms={content.rooms}
        propertyDestinationHref={propertyDestinationHref}
        roomError={content.roomError}
        roomsPending={isPending}
      />
    </>
  );
}
