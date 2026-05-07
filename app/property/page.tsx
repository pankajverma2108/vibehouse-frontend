import { ColiveFlow } from "@/components/colive/colive-flow";
import { Property } from "@/components/marketing/property";
import {
  getDefaultPropertyId,
  getRoomCatalogSnapshot,
  getRoomAvailabilitySnapshot,
  roomTypesToPropertyCategories,
} from "@/lib/cx-api";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function readValidIsoDate(value?: string): string | null {
  if (!value || !ISO_DATE_REGEX.test(value)) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10) === value ? value : null;
}

type PropertyPageProps = {
  searchParams?: Promise<{
    checkin?: string;
    checkout?: string;
    property_id?: string;
    type?: string;
    location?: string;
  }>;
};

export default async function PropertyPage({ searchParams }: PropertyPageProps) {
  const params = await searchParams;
  if (params?.type === "colive") {
    return <ColiveFlow initialLocation={params.location} />;
  }

  const requestedPropertyId = params?.property_id || getDefaultPropertyId() || undefined;
  const requestedCheckin = readValidIsoDate(params?.checkin);
  const requestedCheckout = readValidIsoDate(params?.checkout);
  const hasRequestedDateWindow = Boolean(
    requestedCheckin && requestedCheckout && requestedCheckout > requestedCheckin,
  );
  const snapshot = hasRequestedDateWindow
    ? await getRoomAvailabilitySnapshot({
        propertyId: requestedPropertyId,
        checkin: requestedCheckin!,
        checkout: requestedCheckout!,
      })
    : await getRoomCatalogSnapshot({
        propertyId: requestedPropertyId,
      });
  const backendPropertyId = snapshot.propertyId || requestedPropertyId;

  return (
    <Property
      propertyId={backendPropertyId}
      initialCheckIn={hasRequestedDateWindow ? requestedCheckin! : undefined}
      initialCheckOut={hasRequestedDateWindow ? requestedCheckout! : undefined}
      initialAvailabilityEnabled={hasRequestedDateWindow}
      initialRoomCategories={roomTypesToPropertyCategories(snapshot.roomTypes)}
    />
  );
}
