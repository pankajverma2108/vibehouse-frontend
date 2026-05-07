import { locationMap, propertyHero } from "@/content/rooms";

export type GuestPropertyLocation = {
  propertyId: string;
  title: string;
  address: string;
  embedUrl: string;
  mapsHref: string;
  neighborhoodLabel: string;
};

const guestPropertyLocations: Record<string, GuestPropertyLocation> = {
  "60765": {
    propertyId: "60765",
    title: locationMap.title,
    address: locationMap.address,
    embedUrl: locationMap.embedUrl,
    mapsHref: propertyHero.mapsHref,
    neighborhoodLabel: "Koramangala, Bengaluru",
  },
};

const fallbackGuestPropertyLocation = guestPropertyLocations["60765"];

export function getGuestPropertyLocation(propertyId?: string | null): GuestPropertyLocation {
  if (!propertyId) {
    return fallbackGuestPropertyLocation;
  }

  return guestPropertyLocations[propertyId] ?? fallbackGuestPropertyLocation;
}
