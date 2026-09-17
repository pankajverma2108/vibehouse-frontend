"use client";

import type { ReactNode } from "react";

import { GuestBookingGate } from "@/components/guest/guest-route-gate";
import { GuestHubShell } from "@/components/guest/guest-hub-shell";
import { DynamicRouteState } from "@/components/static-export/dynamic-route-state";
import { useViewerPathParam } from "@/hooks/use-viewer-path-param";
import { GuestExperienceProvider } from "@/state/guest-experience-provider";

export function ScopedGuestLayout({ children }: { children: ReactNode }) {
  const bookingId = useViewerPathParam(0);
  if (!bookingId.isReady) return <DynamicRouteState />;
  if (!bookingId.value) return <DynamicRouteState invalid />;

  return (
    <GuestExperienceProvider initialBookingId={bookingId.value}>
      <GuestHubShell>
        <GuestBookingGate bookingId={bookingId.value}>{children}</GuestBookingGate>
      </GuestHubShell>
    </GuestExperienceProvider>
  );
}
