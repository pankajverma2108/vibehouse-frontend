"use client";

import { PreArrivalPage } from "@/components/booking/pre-arrival-page";
import { DynamicRouteState } from "@/components/static-export/dynamic-route-state";
import { useViewerPathParam } from "@/hooks/use-viewer-path-param";

export function WebCheckInRoute() {
  const eri = useViewerPathParam(1);
  if (!eri.isReady) return <DynamicRouteState />;
  if (!eri.value) return <DynamicRouteState invalid />;
  return <PreArrivalPage ezeeReservationId={eri.value} />;
}
