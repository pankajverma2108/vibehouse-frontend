import { redirect } from "next/navigation";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";

type RoomsPageProps = {
  searchParams?: Promise<{
    checkin?: string;
    checkout?: string;
    property_id?: string;
    type?: string;
    location?: string;
  }>;
};

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
  const params = await searchParams;

  const destination = new URL(getDefaultPropertyDestinationHref(params?.property_id), "http://localhost");
  const query = destination.searchParams;

  if (params?.checkin) {
    query.set("checkin", params.checkin);
  }

  if (params?.checkout) {
    query.set("checkout", params.checkout);
  }

  if (params?.property_id) {
    query.set("property_id", params.property_id);
  }

  if (params?.type) {
    query.set("type", params.type);
  }

  if (params?.location) {
    query.set("location", params.location);
  }

  // If the caller already provided a date window, honour it; otherwise inject today→tomorrow
  // so /property always opens with live availability pre-loaded.
  redirect(`/property?${query.toString()}`);
}
