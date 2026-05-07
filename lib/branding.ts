const ZOSTEL_PATTERN = /\bzostel\b/gi;
const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127(?:\.\d+){3})(:\d+)?$/i;
const DEFAULT_SITE_ORIGIN = "https://extendbasedesignsections.vercel.app";

export const BRAND_NAME = "The Daily Social";
export const BRAND_SHORT_NAME = "TDS";

function looksLikeSystemId(value: string): boolean {
  // Reservation/property identifiers should not be shown as end-user location names.
  return /^[A-Z0-9_-]{4,}$/i.test(value);
}

export function withBrandName(value?: string | null, fallback: string = BRAND_NAME): string {
  const raw = (value || "").trim();
  if (!raw) {
    return fallback;
  }

  const branded = raw.replace(ZOSTEL_PATTERN, BRAND_NAME).trim();
  if (!branded || looksLikeSystemId(branded)) {
    return fallback;
  }

  return branded;
}

export function withBrandShortName(value?: string | null, fallback: string = BRAND_SHORT_NAME): string {
  const raw = (value || "").trim();
  if (!raw) {
    return fallback;
  }

  const branded = raw.replace(ZOSTEL_PATTERN, BRAND_SHORT_NAME).trim();
  return branded || fallback;
}

export function toBrandCheckinLink(ezeeReservationId: string): string {
  const safeId = encodeURIComponent(ezeeReservationId);
  return `/bookings/${safeId}/web-check-in`;
}

function toOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

export function getPreferredSiteOrigin(): string {
  if (typeof window !== "undefined") {
    const browserOrigin = toOrigin(window.location.origin);
    if (browserOrigin && !LOCALHOST_PATTERN.test(browserOrigin)) {
      return browserOrigin;
    }
  }

  const envOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of envOrigins) {
    const origin = toOrigin(candidate);
    if (origin && !LOCALHOST_PATTERN.test(origin)) {
      return origin;
    }
  }

  return DEFAULT_SITE_ORIGIN;
}

export function toAbsoluteBrandCheckinLink(ezeeReservationId: string): string {
  return `${getPreferredSiteOrigin()}${toBrandCheckinLink(ezeeReservationId)}`;
}
