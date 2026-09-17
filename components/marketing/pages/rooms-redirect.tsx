"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import Loading from "@/app/property/loading";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";

export function RoomsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const destination = new URL(
      getDefaultPropertyDestinationHref(searchParams.get("property_id") ?? undefined),
      window.location.origin,
    );

    for (const key of ["checkin", "checkout", "property_id", "type", "location"] as const) {
      const value = searchParams.get(key);
      if (value) {
        destination.searchParams.set(key, value);
      }
    }

    router.replace(`${destination.pathname}?${destination.searchParams.toString()}`);
  }, [router, searchParams]);

  return <Loading />;
}
