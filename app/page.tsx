import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { HeroCarousel } from "@/components/marketing/widgets/hero-carousel";
import { BookingWidget } from "@/components/marketing/widgets/booking-widget";
import { heroImages, homePageContent } from "@/content/home";
import {
  getDefaultPropertyDestinationHref,
  getPublicEventsResult,
  getRoomAvailabilitySnapshot,
  roomTypesToHomeCards,
} from "@/lib/cx-api";
import { resolveServerPropertyId } from "@/lib/property-resolver";
import { headers } from "next/headers";

const HomeSections = dynamic(() =>
  import("@/components/marketing/pages/home-sections").then((mod) => mod.HomeSections),
);

type HomePageProps = {
  searchParams?: Promise<{
    checkin?: string;
    checkout?: string;
    property_id?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const headerList = await headers();
  const hostname = headerList.get("host") || "";
  const propertyId = resolveServerPropertyId({ explicit: params?.property_id, hostname });

  if (!params?.checkin || !params?.checkout || !params?.property_id || !propertyId) {
    redirect(getDefaultPropertyDestinationHref(propertyId, "/"));
  }

  // Always route "Book Now" / room card links to /property with today→tomorrow pre-filled.
  // The BookingWidget will update the dates when the user picks different ones.
  const propertyDestinationHref = getDefaultPropertyDestinationHref(propertyId);

  // checkin/checkout are guaranteed by the redirect guard above — always present here.
  // getRoomAvailabilitySnapshot fetches /guest/booking/availability with the given dates,
  // returning date-specific total prices + live inventory (available / limited / sold out).
  // No frontend room fallback is injected if the availability call fails.
  const snapshot = await getRoomAvailabilitySnapshot({
    propertyId,
    checkin: params.checkin,
    checkout: params.checkout,
  });

  const dynamicHomeRooms = roomTypesToHomeCards(snapshot.roomTypes, { destinationHref: propertyDestinationHref });
  const eventsResult = await getPublicEventsResult({ propertyId, limit: 3 });

  return (
    <>
      <section className="relative min-h-[85vh] overflow-hidden">
        <HeroCarousel images={heroImages} titleParts={homePageContent.heroTitle} />
        <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center px-4">
          <div className="w-full max-w-[500px]">
            <BookingWidget
              destinationHref={propertyDestinationHref}
              initialCheckIn={params?.checkin}
              initialCheckOut={params?.checkout}
              submitLabel="Book Now"
              variant="hero"
            />
          </div>
        </div>
      </section>

      <HomeSections
        eventError={eventsResult.error}
        homeEvents={eventsResult.events}
        homeRooms={dynamicHomeRooms}
        propertyDestinationHref={propertyDestinationHref}
        roomError={snapshot.availabilityError}
      />
    </>
  );
}
