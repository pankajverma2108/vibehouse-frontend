"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { GuestAccessState } from "@/components/guest/guest-access-state";
import { getActiveGuestHubBooking, getGuestHubStatus, getScopedGuestHubHref, isGuestHubEligibleBooking, findGuestBookingById } from "@/lib/guest-hub";

export function GuestHubEntryGate() {
  const router = useRouter();
  const { guest, isAuthenticated, isRestoringSession } = useGuestAuth();
  const activeBooking = useMemo(() => getActiveGuestHubBooking(guest?.bookings ?? []), [guest?.bookings]);

  useEffect(() => {
    if (!isRestoringSession && isAuthenticated && activeBooking) {
      router.replace(getScopedGuestHubHref(activeBooking.ezee_reservation_id));
    }
  }, [activeBooking, isAuthenticated, isRestoringSession, router]);

  if (isRestoringSession) {
    return <div className="h-80 animate-pulse rounded-[12px] bg-white/5" />;
  }

  if (!isAuthenticated) {
    return (
      <GuestAccessState
        description="Sign in with your guest account to unlock the stay hub linked to your in-house booking."
        showSignIn
        title="Your Guest Hub unlocks once your stay is live."
      />
    );
  }

  return (
    <GuestAccessState
      description="Guest Hub opens against the booking that is currently active for you. If you have an upcoming stay, it will appear here once the stay becomes live."
      title="No active stay is available for Guest Hub yet."
    />
  );
}

export function GuestBookingGate({ bookingId, children }: { bookingId: string; children: ReactNode }) {
  const { guest, isAuthenticated, isRestoringSession } = useGuestAuth();
  const matchingBooking = useMemo(() => findGuestBookingById(guest?.bookings ?? [], bookingId), [bookingId, guest?.bookings]);

  if (isRestoringSession) {
    return <div className="h-80 animate-pulse rounded-[12px] bg-white/5" />;
  }

  if (!isAuthenticated) {
    return (
      <GuestAccessState
        description="Sign in with the booking-linked guest account to enter this stay hub."
        showSignIn
        title="Guest Hub needs an authenticated booking."
      />
    );
  }

  if (!matchingBooking) {
    return (
      <GuestAccessState
        description="This booking is not linked to the current guest account. Use My Bookings to switch to a valid stay."
        title="This stay is not available in your Guest Hub."
      />
    );
  }

  if (!isGuestHubEligibleBooking(matchingBooking)) {
    const status = getGuestHubStatus(matchingBooking);
    const description =
      status === "upcoming"
        ? "This booking is linked to your account, but the hub opens once the stay becomes active at the property."
        : "This stay is no longer active for Guest Hub access. You can still review it from My Bookings.";

    return (
      <GuestAccessState
        description={description}
        title={status === "upcoming" ? "Your stay is booked, but Guest Hub is not open yet." : "This stay is no longer active in Guest Hub."}
      />
    );
  }

  return <>{children}</>;
}

export function GuestLegacyRouteRedirect({ subpath = "" }: { subpath?: string }) {
  const router = useRouter();
  const { guest, isAuthenticated, isRestoringSession } = useGuestAuth();
  const activeBooking = useMemo(() => getActiveGuestHubBooking(guest?.bookings ?? []), [guest?.bookings]);

  useEffect(() => {
    if (isRestoringSession) {
      return;
    }

    if (isAuthenticated && activeBooking) {
      router.replace(getScopedGuestHubHref(activeBooking.ezee_reservation_id, subpath));
      return;
    }

    router.replace("/guest");
  }, [activeBooking, isAuthenticated, isRestoringSession, router, subpath]);

  return <div className="h-48 animate-pulse rounded-[12px] bg-white/5" />;
}
