"use client";

import { useEffect } from "react";

import { DynamicRouteState } from "@/components/static-export/dynamic-route-state";
import { useViewerPathParam } from "@/hooks/use-viewer-path-param";
import { getScopedGuestHubHref } from "@/lib/guest-hub";

export function ScopedGuestRedirect({ subpath }: { subpath: string }) {
  const bookingId = useViewerPathParam(0);

  useEffect(() => {
    if (bookingId.value) {
      window.location.replace(getScopedGuestHubHref(bookingId.value, subpath));
    }
  }, [bookingId.value, subpath]);

  return <DynamicRouteState invalid={bookingId.isReady && !bookingId.value} />;
}
