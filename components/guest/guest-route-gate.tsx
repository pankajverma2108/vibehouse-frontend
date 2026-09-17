"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { GuestAccessState } from "@/components/guest/guest-access-state";
import { getStoredGuestToken } from "@/lib/guest-auth-api";
import { getGuestBookings, linkGuestBooking } from "@/lib/booking-api";
import { findGuestBookingById, getActiveGuestHubBooking, getGuestHubStatus, getScopedGuestHubHref, isGuestHubEligibleBooking, isInHouseBookingStatus } from "@/lib/guest-hub";

type GateBookingLike = {
  ezee_reservation_id: string;
  checkin_date: string;
  checkout_date: string;
  status: string;
};

function applyStatusOverride<T extends GateBookingLike>(booking: T, nextStatus?: string | null): T {
  if (!nextStatus) {
    return booking;
  }

  return {
    ...booking,
    status: nextStatus,
  };
}

export function GuestHubEntryGate() {
  const router = useRouter();
  const { guest, isAuthenticated, isRestoringSession } = useGuestAuth();
  const activeBooking = useMemo(() => getActiveGuestHubBooking(guest?.bookings ?? []), [guest?.bookings]);
  const [fallbackBookingId, setFallbackBookingId] = useState<string | null>(null);
  const [isResolvingFallback, setIsResolvingFallback] = useState(false);

  useEffect(() => {
    const nextBookingId = activeBooking?.ezee_reservation_id ?? fallbackBookingId;
    if (!isRestoringSession && isAuthenticated && nextBookingId) {
      window.location.replace(getScopedGuestHubHref(nextBookingId));
    }
  }, [activeBooking?.ezee_reservation_id, fallbackBookingId, isAuthenticated, isRestoringSession, router]);

  useEffect(() => {
    if (isRestoringSession || !isAuthenticated || activeBooking) {
      setFallbackBookingId((current) => (current === null ? current : null));
      setIsResolvingFallback((current) => (current ? false : current));
      return;
    }

    const token = getStoredGuestToken();
    if (!token) {
      setFallbackBookingId((current) => (current === null ? current : null));
      setIsResolvingFallback((current) => (current ? false : current));
      return;
    }

    let cancelled = false;
    setIsResolvingFallback(true);

    const resolveFallbackBooking = async () => {
      try {
        const bookings = await getGuestBookings(token);
        const activeDateWindowCandidates = bookings.filter((booking) => getGuestHubStatus(booking) === "active");

        let resolvedBookingId: string | null = null;

        for (const candidate of activeDateWindowCandidates) {
          const linked = await linkGuestBooking(token, candidate.ezee_reservation_id);
          const linkedStatus = linked.booking.status || linked.access.status || candidate.status;

          if (isGuestHubEligibleBooking(applyStatusOverride(candidate, linkedStatus)) || isInHouseBookingStatus(linked.access.status)) {
            resolvedBookingId = candidate.ezee_reservation_id;
            break;
          }
        }

        if (!cancelled) {
          setFallbackBookingId(resolvedBookingId);
        }
      } catch {
        if (!cancelled) {
          setFallbackBookingId(null);
        }
      } finally {
        if (!cancelled) {
          setIsResolvingFallback(false);
        }
      }
    };

    void resolveFallbackBooking();

    return () => {
      cancelled = true;
    };
  }, [activeBooking, isAuthenticated, isRestoringSession]);

  if (isRestoringSession || isResolvingFallback) {
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
  const [fallbackEligible, setFallbackEligible] = useState(false);
  const [isResolvingFallback, setIsResolvingFallback] = useState(false);

  useEffect(() => {
    if (isRestoringSession || !isAuthenticated || !matchingBooking || isGuestHubEligibleBooking(matchingBooking)) {
      setFallbackEligible((current) => (current ? false : current));
      setIsResolvingFallback((current) => (current ? false : current));
      return;
    }

    const token = getStoredGuestToken();
    if (!token) {
      setFallbackEligible((current) => (current ? false : current));
      setIsResolvingFallback((current) => (current ? false : current));
      return;
    }

    let cancelled = false;
    setFallbackEligible((current) => (current ? false : current));
    setIsResolvingFallback(true);

    const resolveScopedEligibility = async () => {
      try {
        const linked = await linkGuestBooking(token, bookingId);
        const linkedStatus = linked.booking.status || linked.access.status || matchingBooking.status;
        const bookingWithResolvedStatus = applyStatusOverride(matchingBooking, linkedStatus);
        const nextEligible = isGuestHubEligibleBooking(bookingWithResolvedStatus) || isInHouseBookingStatus(linked.access.status);

        if (!cancelled) {
          setFallbackEligible(nextEligible);
        }
      } catch {
        if (!cancelled) {
          setFallbackEligible(false);
        }
      } finally {
        if (!cancelled) {
          setIsResolvingFallback(false);
        }
      }
    };

    void resolveScopedEligibility();

    return () => {
      cancelled = true;
    };
  }, [bookingId, isAuthenticated, isRestoringSession, matchingBooking]);

  if (isRestoringSession || isResolvingFallback) {
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

  if (!isGuestHubEligibleBooking(matchingBooking) && !fallbackEligible) {
    const status = getGuestHubStatus(matchingBooking);
    const isPastStay = status === "past";
    const description =
      !isPastStay
        ? "This booking is linked to your account, but the hub opens once the stay becomes active at the property."
        : "This stay is no longer active for Guest Hub access. You can still review it from My Bookings.";

    return (
      <GuestAccessState
        description={description}
        title={!isPastStay ? "Your stay is booked, but Guest Hub is not open yet." : "This stay is no longer active in Guest Hub."}
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
      window.location.replace(getScopedGuestHubHref(activeBooking.ezee_reservation_id, subpath));
      return;
    }

    router.replace("/guest");
  }, [activeBooking, isAuthenticated, isRestoringSession, router, subpath]);

  return <div className="h-48 animate-pulse rounded-[12px] bg-white/5" />;
}
