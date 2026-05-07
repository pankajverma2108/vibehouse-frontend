"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import { useGuestAuth } from "@/components/auth/guest-auth-provider";
import { getActiveGuestHubBooking, getScopedGuestHubHref } from "@/lib/guest-hub";

export type GuestModalState =
  | { type: "SERVICE_REQUEST"; payload?: { serviceId?: string; title?: string } }
  | { type: "BORROW_REQUEST"; productId: string }
  | { type: "RETURN_ITEM"; productId: string }
  | { type: "EXTEND_STAY"; bookingId: string }
  | { type: "TIME_SLOT"; mode: "LATE_CHECKOUT" | "EARLY_CHECKIN" }
  | { type: "LOST_FOUND"; itemId?: string };

type GuestExperienceContextValue = {
  selectedBookingId: string | null;
  setSelectedBookingId: (bookingId: string | null) => void;
  getGuestRouteHref: (subpath?: string) => string;
  activeModal: GuestModalState | null;
  badgeCounts: {
    cart: number;
    borrow: number;
  };
  setCartCount: (count: number) => void;
  setBorrowCount: (count: number) => void;
  paymentSyncTick: number;
  markPaymentCompleted: () => void;
};

const GuestExperienceContext = createContext<GuestExperienceContextValue | null>(null);

export function GuestExperienceProvider({ children, initialBookingId = null }: { children: ReactNode; initialBookingId?: string | null }) {
  const { guest } = useGuestAuth();
  const [selectedBookingIdOverride, setSelectedBookingIdOverride] = useState<string | null>(null);
  const [cartCount, setCartCountState] = useState(0);
  const [borrowCount, setBorrowCountState] = useState(0);
  const [paymentSyncTick, setPaymentSyncTick] = useState(0);
  const guestBookings = useMemo(() => guest?.bookings ?? [], [guest?.bookings]);

  const selectedBookingId = useMemo(() => {
    if (initialBookingId) {
      return initialBookingId;
    }

    if (selectedBookingIdOverride && guestBookings.some((booking) => booking.ezee_reservation_id === selectedBookingIdOverride)) {
      return selectedBookingIdOverride;
    }

    return getActiveGuestHubBooking(guestBookings)?.ezee_reservation_id ?? null;
  }, [guestBookings, initialBookingId, selectedBookingIdOverride]);

  const setSelectedBookingId = useCallback((bookingId: string | null) => {
    setSelectedBookingIdOverride(bookingId);
  }, []);

  const contextValue = useMemo<GuestExperienceContextValue>(
    () => ({
      selectedBookingId,
      setSelectedBookingId,
      getGuestRouteHref: (subpath = "") => (selectedBookingId ? getScopedGuestHubHref(selectedBookingId, subpath) : "/guest"),
      activeModal: null,
      badgeCounts: {
        cart: cartCount,
        borrow: borrowCount,
      },
      setCartCount: (count) => setCartCountState(Math.max(0, Math.trunc(Number.isFinite(count) ? count : 0))),
      setBorrowCount: (count) => setBorrowCountState(Math.max(0, Math.trunc(Number.isFinite(count) ? count : 0))),
      paymentSyncTick,
      markPaymentCompleted: () => setPaymentSyncTick((current) => current + 1),
    }),
    [borrowCount, cartCount, paymentSyncTick, selectedBookingId, setSelectedBookingId],
  );

  return <GuestExperienceContext.Provider value={contextValue}>{children}</GuestExperienceContext.Provider>;
}

export function useGuestExperience() {
  const contextValue = useContext(GuestExperienceContext);

  if (!contextValue) {
    throw new Error("useGuestExperience must be used within GuestExperienceProvider.");
  }

  return contextValue;
}
