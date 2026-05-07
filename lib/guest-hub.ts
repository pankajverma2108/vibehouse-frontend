import type { GuestBookingSummary } from "@/lib/guest-auth-api";

export type GuestHubBookingLike = Pick<
  GuestBookingSummary,
  "ezee_reservation_id" | "status" | "checkin_date" | "checkout_date"
>;

function parseBookingTimestamp(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function getBookingNowTimestamp(): number {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return now.getTime();
}

export function getGuestHubStatus(booking: GuestHubBookingLike): "active" | "upcoming" | "past" {
  const normalizedStatus = (booking.status || "").toUpperCase();
  const nowTimestamp = getBookingNowTimestamp();
  const checkInTimestamp = parseBookingTimestamp(booking.checkin_date);
  const checkOutTimestamp = parseBookingTimestamp(booking.checkout_date);

  if (normalizedStatus === "CANCELLED" || normalizedStatus === "CHECKED_OUT" || normalizedStatus === "COMPLETED" || normalizedStatus === "REJECTED") {
    return "past";
  }

  if (checkInTimestamp !== null && nowTimestamp < checkInTimestamp) {
    return "upcoming";
  }

  if (checkOutTimestamp !== null && nowTimestamp <= checkOutTimestamp) {
    return "active";
  }

  return "past";
}

export function isGuestHubEligibleBooking(booking: GuestHubBookingLike): boolean {
  const normalizedStatus = (booking.status || "").toUpperCase();

  if (normalizedStatus === "CHECKED_IN" || normalizedStatus === "IN_HOUSE" || normalizedStatus === "INHOUSE" || normalizedStatus === "ACTIVE") {
    return true;
  }

  if (normalizedStatus === "CANCELLED" || normalizedStatus === "CHECKED_OUT" || normalizedStatus === "COMPLETED" || normalizedStatus === "REJECTED") {
    return false;
  }

  if (normalizedStatus !== "APPROVED" && normalizedStatus !== "CONFIRMED") {
    return false;
  }

  return getGuestHubStatus(booking) === "active";
}

export function getActiveGuestHubBooking<T extends GuestHubBookingLike>(bookings: T[]): T | null {
  const eligible = bookings.filter(isGuestHubEligibleBooking);
  if (eligible.length === 0) {
    return null;
  }

  return eligible.sort((left, right) => {
    const leftCheckout = parseBookingTimestamp(left.checkout_date) ?? Number.POSITIVE_INFINITY;
    const rightCheckout = parseBookingTimestamp(right.checkout_date) ?? Number.POSITIVE_INFINITY;
    return leftCheckout - rightCheckout;
  })[0] ?? null;
}

export function findGuestBookingById<T extends GuestHubBookingLike>(bookings: T[], bookingId?: string | null): T | null {
  if (!bookingId) {
    return null;
  }

  return bookings.find((booking) => booking.ezee_reservation_id === bookingId) ?? null;
}

export function getScopedGuestHubHref(bookingId: string, subpath = ""): string {
  const normalizedBookingId = bookingId.trim();
  const normalizedSubpath = subpath.replace(/^\/+/, "");

  if (!normalizedSubpath) {
    return `/${encodeURIComponent(normalizedBookingId)}/guest`;
  }

  return `/${encodeURIComponent(normalizedBookingId)}/guest/${normalizedSubpath}`;
}
