import dynamic from "next/dynamic";
import {
  getRoomCatalogSnapshot,
  getRoomAvailabilitySnapshot,
  roomTypesToPropertyCategories,
} from "@/lib/cx-api";
import { resolveServerPropertyId } from "@/lib/property-resolver";
import { headers } from "next/headers";

const Property = dynamic(() => import("@/components/marketing/property").then((mod) => mod.Property), {
  loading: () => <div className="min-h-screen bg-[#07070a]" />,
});

const ColiveFlow = dynamic(() => import("@/components/colive/colive-flow").then((mod) => mod.ColiveFlow), {
  loading: () => <div className="min-h-screen bg-[#07070a]" />,
});

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

  const headerList = await headers();
  const hostname = headerList.get("host") || "";
  const requestedPropertyId = resolveServerPropertyId({ explicit: params?.property_id, hostname }) || "";
  const requestedCheckin = readValidIsoDate(params?.checkin) || "";
  const requestedCheckout = readValidIsoDate(params?.checkout) || "";
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
      initialRoomError={snapshot.availabilityError}
      initialRoomCategories={roomTypesToPropertyCategories(snapshot.roomTypes)}
    />
  );
}
