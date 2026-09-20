"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

import { usePropertyId } from "@/hooks/use-property-id";
import Loading from "@/app/property/loading";

const Property = dynamic(() => import("@/components/marketing/property").then((mod) => mod.Property), {
  loading: () => <Loading />,
});

const ColiveFlow = dynamic(() => import("@/components/colive/colive-flow").then((mod) => mod.ColiveFlow), {
  loading: () => <Loading />,
});

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function readValidIsoDate(value: string | null): string | null {
  if (!value || !ISO_DATE_REGEX.test(value)) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

export function PropertyClientPage() {
  const searchParams = useSearchParams();
  const propertyId = usePropertyId(searchParams.get("property_id"));

  if (searchParams.get("type") === "colive") {
    return <ColiveFlow initialLocation={searchParams.get("location") || undefined} />;
  }

  const checkin = readValidIsoDate(searchParams.get("checkin"));
  const checkout = readValidIsoDate(searchParams.get("checkout"));
  const hasDateWindow = Boolean(checkin && checkout && checkout > checkin);

  return (
    <Property
      initialAvailabilityEnabled={hasDateWindow}
      initialCheckIn={hasDateWindow ? checkin! : undefined}
      initialCheckOut={hasDateWindow ? checkout! : undefined}
      propertyId={propertyId}
    />
  );
}
