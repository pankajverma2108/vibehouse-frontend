import { redirect } from "next/navigation";
import { HeroCarousel } from "@/components/marketing/widgets/hero-carousel";
import { HomeSections } from "@/components/marketing/pages/home-sections";
import { BookingWidget } from "@/components/marketing/widgets/booking-widget";
import { heroImages, homePageContent } from "@/content/home";
import {
  getDefaultPropertyId,
  getDefaultPropertyDestinationHref,
  getPublicEvents,
  getRoomAvailabilitySnapshot,
  roomTypesToHomeCards,
} from "@/lib/cx-api";

type HomePageProps = {
  searchParams?: Promise<{
    checkin?: string;
    checkout?: string;
    property_id?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const propertyId = params?.property_id || getDefaultPropertyId() || undefined;

  if (!params?.checkin || !params?.checkout || !params?.property_id) {
    redirect(getDefaultPropertyDestinationHref(propertyId, "/"));
  }

  // Always route "Book Now" / room card links to /property with today→tomorrow pre-filled.
  // The BookingWidget will update the dates when the user picks different ones.
  const propertyDestinationHref = getDefaultPropertyDestinationHref(propertyId);

  // checkin/checkout are guaranteed by the redirect guard above — always present here.
  // getRoomAvailabilitySnapshot fetches /guest/booking/availability with the given dates,
  // returning date-specific total prices + live inventory (available / limited / sold out).
  // It internally falls back to the catalog if the availability endpoint is unavailable.
  const snapshot = await getRoomAvailabilitySnapshot({
    propertyId,
    checkin: params.checkin,
    checkout: params.checkout,
  });

  const dynamicHomeRooms = roomTypesToHomeCards(snapshot.roomTypes, { destinationHref: propertyDestinationHref });
  const dynamicHomeEvents = await getPublicEvents({ propertyId, limit: 3 });

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
        homeEvents={dynamicHomeEvents}
        homeRooms={dynamicHomeRooms}
        propertyDestinationHref={propertyDestinationHref}
      />
    </>
  );
}
