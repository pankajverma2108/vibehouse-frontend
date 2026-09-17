import {
  getRoomAvailabilitySnapshot,
  roomTypesToPropertyCategories,
  type AvailabilitySource,
  type CxRoomCategory,
  type NormalizedRoomType,
} from "@/lib/cx-api";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PROPERTY_ID_REGEX = /^\d+$/;

export type CxRoomsPayload = {
  property_id: string;
  checkin?: string;
  checkout?: string;
  mode: "catalog" | "availability";
  availability_source?: AvailabilitySource;
  has_live_availability: boolean;
  availability_error: string | null;
  room_types: NormalizedRoomType[];
  categories: CxRoomCategory[];
};

export class CxRoomsRequestError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CxRoomsRequestError";
    this.code = code;
  }
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }

  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function loadCxRooms(options: {
  propertyId: string;
  checkin?: string;
  checkout?: string;
  signal?: AbortSignal;
}): Promise<CxRoomsPayload> {
  const propertyId = options.propertyId.trim();
  const checkin = options.checkin?.trim() || "";
  const checkout = options.checkout?.trim() || "";

  if (!propertyId) {
    throw new CxRoomsRequestError("missing_property_id", "property_id query param is required.");
  }
  if (!PROPERTY_ID_REGEX.test(propertyId)) {
    throw new CxRoomsRequestError("invalid_property_id", "Invalid property_id format.");
  }
  if (Boolean(checkin) !== Boolean(checkout)) {
    throw new CxRoomsRequestError(
      "invalid_date_range",
      "Provide both checkin and checkout together, or omit both for catalog mode.",
    );
  }
  if (checkin && !isValidIsoDate(checkin)) {
    throw new CxRoomsRequestError("invalid_checkin", "checkin must be in YYYY-MM-DD format.");
  }
  if (checkout && !isValidIsoDate(checkout)) {
    throw new CxRoomsRequestError("invalid_checkout", "checkout must be in YYYY-MM-DD format.");
  }
  if (checkin && checkout && checkout <= checkin) {
    throw new CxRoomsRequestError("invalid_date_window", "checkout must be after checkin.");
  }

  const snapshot = await getRoomAvailabilitySnapshot({
    propertyId,
    checkin: checkin || undefined,
    checkout: checkout || undefined,
    signal: options.signal,
  });

  return {
    property_id: snapshot.propertyId || propertyId,
    checkin: snapshot.checkin || undefined,
    checkout: snapshot.checkout || undefined,
    mode: snapshot.mode,
    availability_source: snapshot.mode === "availability" ? snapshot.availabilitySource : undefined,
    has_live_availability: snapshot.hasLiveAvailability,
    availability_error: snapshot.availabilityError,
    room_types: snapshot.roomTypes,
    categories: roomTypesToPropertyCategories(snapshot.roomTypes),
  };
}
