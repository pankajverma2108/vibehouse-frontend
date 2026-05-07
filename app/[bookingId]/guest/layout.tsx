import type { ReactNode } from "react";

import { GuestBookingGate } from "@/components/guest/guest-route-gate";
import { GuestHubShell } from "@/components/guest/guest-hub-shell";
import { GuestExperienceProvider } from "@/state/guest-experience-provider";

export default async function ScopedGuestLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  return (
    <GuestExperienceProvider initialBookingId={bookingId}>
      <GuestHubShell>
        <GuestBookingGate bookingId={bookingId}>{children}</GuestBookingGate>
      </GuestHubShell>
    </GuestExperienceProvider>
  );
}
