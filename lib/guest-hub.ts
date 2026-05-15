import type { GuestBookingSummary } from "@/lib/guest-auth-api";

export type GuestHubBookingLike = Pick<
  GuestBookingSummary,
  "ezee_reservation_id" | "status" | "checkin_date" | "checkout_date"
>;

// Temporary override for frontend design/testing while backend status mapping is being fixed.
// Remove or switch to false once guest APIs return in-house statuses (ARRIVED/CHECKED_IN/IN_HOUSE).
const TEMPORARY_ALLOW_DATE_RANGE_ONLY_GUEST_HUB_ACCESS = true;

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

export function normalizeBookingStatus(status?: string | null): string {
  return (status || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function isInHouseBookingStatus(status?: string | null): boolean {
  const normalizedStatus = normalizeBookingStatus(status);
  return normalizedStatus === "ARRIVED"
    || normalizedStatus === "CHECKED_IN"
    || normalizedStatus === "CHECKEDIN"
    || normalizedStatus === "IN_HOUSE"
    || normalizedStatus === "INHOUSE";
}

export function getGuestHubStatus(booking: GuestHubBookingLike): "active" | "upcoming" | "past" {
  const normalizedStatus = normalizeBookingStatus(booking.status);
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
  if (TEMPORARY_ALLOW_DATE_RANGE_ONLY_GUEST_HUB_ACCESS) {
    return getGuestHubStatus(booking) === "active";
  }

  if (!isInHouseBookingStatus(booking.status)) {
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
  const normalizedSubpath = subpath.trim().replace(/^\/+/, "");
  const [pathPart = "", hashPart = ""] = normalizedSubpath.split("#");
  const hash = hashPart ? `#${hashPart}` : "";
  const baseHref = `/${encodeURIComponent(normalizedBookingId)}/guest`;

  if (!pathPart) {
    return `${baseHref}${hash}`;
  }

  return `${baseHref}/${pathPart}${hash}`;
}
