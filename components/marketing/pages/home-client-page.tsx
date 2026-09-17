"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { HeroCarousel } from "@/components/marketing/widgets/hero-carousel";
import { BookingWidget } from "@/components/marketing/widgets/booking-widget";
import { heroImages, homePageContent } from "@/content/home";
import type { EventCardProps, RoomCardProps } from "@/content/types";
import { usePropertyId } from "@/hooks/use-property-id";
import {
  getDefaultPropertyDestinationHref,
  getPublicEventsResult,
  getRoomAvailabilitySnapshot,
  roomTypesToHomeCards,
} from "@/lib/cx-api";

const HomeSections = dynamic(() =>
  import("@/components/marketing/pages/home-sections").then((mod) => mod.HomeSections),
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
  events: [],
  roomError: null,
  rooms: [],
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

        setContent({
          eventError: eventsResult.error,
          events: eventsResult.events,
          key: requestKey,
          roomError: snapshot.availabilityError,
          rooms: roomTypesToHomeCards(snapshot.roomTypes, { destinationHref: propertyDestinationHref }),
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Live stay details are unavailable right now.";
        setContent({
          eventError: message,
          events: [],
          key: requestKey,
          roomError: message,
          rooms: [],
        });
      }
    }

    void loadContent();
    return () => controller.abort();
  }, [checkin, checkout, explicitPropertyId, propertyDestinationHref, propertyId, requestKey]);

  return (
    <>
      <section className="relative min-h-[85vh] overflow-hidden">
        <HeroCarousel images={heroImages} titleParts={homePageContent.heroTitle} />
        <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center px-4">
          <div className="w-full max-w-[500px]">
            <BookingWidget
              destinationHref={propertyDestinationHref}
              initialCheckIn={checkin || undefined}
              initialCheckOut={checkout || undefined}
              submitLabel="Book Now"
              variant="hero"
            />
          </div>
        </div>
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
