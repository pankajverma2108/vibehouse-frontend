"use client";

import { BookingConfirmedPage } from "@/components/booking/booking-confirmed-page";
import { DynamicRouteState } from "@/components/static-export/dynamic-route-state";
import { useViewerPathParam } from "@/hooks/use-viewer-path-param";

export function BookingConfirmedRoute() {
  const eri = useViewerPathParam(1);
  if (!eri.isReady) return <DynamicRouteState />;
  if (!eri.value) return <DynamicRouteState invalid />;
  return <BookingConfirmedPage ezeeReservationId={eri.value} />;
}
