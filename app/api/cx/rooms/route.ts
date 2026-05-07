import { NextResponse } from "next/server";

import { getDefaultPropertyId, getRoomAvailabilitySnapshot, roomTypesToPropertyCategories } from "@/lib/cx-api";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PROPERTY_ID_REGEX = /^\d+$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
}

function jsonError(status: number, code: string, message: string, requestId: string) {
  return NextResponse.json(
    {
      error: code,
      message,
      request_id: requestId,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const { searchParams } = new URL(request.url);
  const configuredPropertyId = getDefaultPropertyId();
  const rawPropertyId = searchParams.get("property_id")?.trim() || "";
  const propertyId = rawPropertyId || configuredPropertyId || undefined;
  const rawCheckin = searchParams.get("checkin")?.trim() || "";
  const rawCheckout = searchParams.get("checkout")?.trim() || "";

  if (propertyId && !PROPERTY_ID_REGEX.test(propertyId)) {
    return jsonError(400, "invalid_property_id", "Invalid property_id format.", requestId);
  }

  const hasCheckin = rawCheckin.length > 0;
  const hasCheckout = rawCheckout.length > 0;

  if (hasCheckin !== hasCheckout) {
    return jsonError(
      400,
      "invalid_date_range",
      "Provide both checkin and checkout together, or omit both for catalog mode.",
      requestId,
    );
  }

  if (hasCheckin && !isValidIsoDate(rawCheckin)) {
    return jsonError(400, "invalid_checkin", "checkin must be in YYYY-MM-DD format.", requestId);
  }

  if (hasCheckout && !isValidIsoDate(rawCheckout)) {
    return jsonError(400, "invalid_checkout", "checkout must be in YYYY-MM-DD format.", requestId);
  }

  if (hasCheckin && hasCheckout && rawCheckout <= rawCheckin) {
    return jsonError(400, "invalid_date_window", "checkout must be after checkin.", requestId);
  }

  try {
    const snapshot = await getRoomAvailabilitySnapshot({
      propertyId,
      checkin: hasCheckin ? rawCheckin : undefined,
      checkout: hasCheckout ? rawCheckout : undefined,
    });

    const categories = roomTypesToPropertyCategories(snapshot.roomTypes);
    const cacheControl = snapshot.mode === "availability"
      ? "public, max-age=30, stale-while-revalidate=60"
      : "public, max-age=300, stale-while-revalidate=3600";

    const response = NextResponse.json({
      property_id: snapshot.propertyId || propertyId || configuredPropertyId,
      checkin: snapshot.checkin || undefined,
      checkout: snapshot.checkout || undefined,
      mode: snapshot.mode,
      availability_source: snapshot.mode === "availability" ? snapshot.availabilitySource : undefined,
      has_live_availability: snapshot.hasLiveAvailability,
      availability_error: snapshot.availabilityError,
      room_types: snapshot.roomTypes,
      categories,
      request_id: requestId,
    });

    response.headers.set("Cache-Control", cacheControl);
    response.headers.set("X-Cx-Rooms-Mode", snapshot.mode);
    response.headers.set("X-Cx-Request-Id", requestId);

    return response;
  } catch {
    return jsonError(
      502,
      "rooms_upstream_error",
      "Unable to fetch room data right now. Please retry.",
      requestId,
    );
  }
}
