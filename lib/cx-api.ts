import type { EventCardProps, RoomCardProps } from "@/content/types";
import { getApiBaseUrl } from "@/lib/vibehouse-api";
import { formatINRPlain } from "@/lib/format-price";

const DEFAULT_PROPERTY_ID = "60765";
const CANONICAL_PROPERTY_ID_REGEX = /^\d+$/;
const FALLBACK_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1647649644192-af6183269fa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200";
const FALLBACK_ROOM_IMAGE = "/images/rooms/room-1.jpg";

// Lightweight runtime telemetry for malformed payload detection
export type TelemetryEvent = {
  type: "null_payload" | "missing_field" | "type_mismatch" | "fallback_used" | "empty_array";
  source: "event" | "room";
  field?: string;
  value?: unknown;
  timestamp: number;
};

let telemetryBuffer: TelemetryEvent[] = [];
const MAX_TELEMETRY_EVENTS = 100;

export function getTelemetryBuffer(): TelemetryEvent[] {
  return [...telemetryBuffer];
}

export function clearTelemetryBuffer(): void {
  telemetryBuffer = [];
}

function recordTelemetry(event: Omit<TelemetryEvent, "timestamp">): void {
  const telemetryEvent: TelemetryEvent = {
    ...event,
    timestamp: Date.now(),
  };

  telemetryBuffer.push(telemetryEvent);

  // Keep buffer bounded to prevent memory leaks
  if (telemetryBuffer.length > MAX_TELEMETRY_EVENTS) {
    telemetryBuffer = telemetryBuffer.slice(-MAX_TELEMETRY_EVENTS);
  }

  // Optional: Log to console in development
  // if (process.env.NODE_ENV === "development") {
  //   console.debug("[CX-API Telemetry]", telemetryEvent);
  // }
}

export type CxRoomCategory = {
  roomTypeId: string;
  slug: string;
  title: string;
  shortTitle: string;
  image: string;
  images?: string[];
  roomType: string;
  inventoryState: InventoryState;
  hasLiveAvailability: boolean;
  guestText: string;
  basePrice: number;
  isPriceUnavailable?: boolean;
  totalPrice: number;
  availableCount: number;
  totalCount: number;
  inventoryText: string;
  features: string[];
  amenitiesLegend: string[];
};

const STATIC_ROOM_GALLERIES = [
  ["/images/rooms/room-1.jpg", "/images/rooms/room-2.jpg", "/images/rooms/room-3.webp"],
  ["/images/rooms/room-2.jpg", "/images/rooms/room-3.webp", "/images/rooms/room-4.jpg"],
  ["/images/rooms/room-4.jpg", "/images/rooms/room-1.jpg", "/images/rooms/room-3.webp"],
];

type HardcodedRoomPresentation = {
  shortTitle: string;
  guestText: string;
  features: string[];
  amenitiesLegend: string[];
};

const HARDCODED_ROOM_PRESENTATION: Array<{
  match: (room: NormalizedRoomType) => boolean;
  presentation: HardcodedRoomPresentation;
}> = [
  {
    match: (room) => {
      const haystack = `${room.name} ${room.slug}`.toLowerCase();
      return haystack.includes("deluxe") || haystack.includes("queen") || haystack.includes("private");
    },
    presentation: {
      shortTitle: "Private Room",
      guestText: "x 2 Guests",
      features: ["Queen bed", "En-suite bathroom", "Work desk", "Mini-fridge"],
      amenitiesLegend: ["AC", "Private bath", "Fresh linen", "Housekeeping"],
    },
  },
  {
    match: (room) => {
      const haystack = `${room.name} ${room.slug}`.toLowerCase();
      return haystack.includes("female");
    },
    presentation: {
      shortTitle: "4-Bed Female Dorm",
      guestText: "x 1 Guest",
      features: ["Women-only floor", "En-suite access", "Reading light", "Secure locker"],
      amenitiesLegend: ["AC", "Locker", "Fresh linen", "Housekeeping"],
    },
  },
  {
    match: () => true,
    presentation: {
      shortTitle: "4-Bed Mixed Dorm",
      guestText: "x 1 Guest",
      features: ["Privacy curtain", "Reading light", "USB charging", "Personal locker"],
      amenitiesLegend: ["AC", "Locker", "Fresh linen", "Housekeeping"],
    },
  },
];

function pickStaticRoomGallery(slugOrName: string, index: number): string[] {
  const id = slugOrName.toLowerCase();

  if (id.includes("female")) {
    return STATIC_ROOM_GALLERIES[1];
  }

  if (id.includes("private")) {
    return STATIC_ROOM_GALLERIES[2];
  }

  if (id.includes("mixed") || id.includes("dorm")) {
    return STATIC_ROOM_GALLERIES[0];
  }

  return STATIC_ROOM_GALLERIES[index % STATIC_ROOM_GALLERIES.length];
}

function getHardcodedRoomPresentation(room: NormalizedRoomType): HardcodedRoomPresentation {
  return HARDCODED_ROOM_PRESENTATION.find((entry) => entry.match(room))!.presentation;
}

type RawEvent = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  date?: unknown;
  time?: unknown;
  location?: unknown;
  capacity?: unknown;
  price_text?: unknown;
  contact_link?: unknown;
  poster_url?: unknown;
  badge_label?: unknown;
  badge_color?: unknown;
};

type RawRoomType = {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  type?: unknown;
  beds_per_room?: unknown;
  total_beds?: unknown;
  available_beds?: unknown;
  inventory_state?: unknown;
  base_price_per_night?: unknown;
  total_price?: unknown;
  amenities?: unknown;
  // BE-side provenance — "db" means data comes from our DB seed, prices are always real numbers
  source?: unknown;
  floor_range?: unknown;
  ezee_room_type_id?: unknown;
  physical_room_count?: unknown;
};

type RawRoomAvailability = {
  property_id?: unknown;
  availability_source?: unknown;
  checkin_date?: unknown;
  checkout_date?: unknown;
  no_of_nights?: unknown;
  room_types?: unknown;
};

export type AvailabilitySource = "catalog" | "ezee_live" | "live_provider" | "local_db_estimate" | "unknown";

export type RoomAvailabilitySnapshot = {
  propertyId: string;
  checkin: string;
  checkout: string;
  mode: "catalog" | "availability";
  availabilitySource: AvailabilitySource;
  hasLiveAvailability: boolean;
  availabilityError: string | null;
  roomTypes: NormalizedRoomType[];
};

export type InventoryState = "available" | "limited" | "sold_out" | "unknown";

export type NormalizedRoomType = {
  id: string;
  name: string;
  slug: string;
  type: string;
  inventoryState: InventoryState;
  hasLiveAvailability: boolean;
  bedsPerRoom: number;
  totalBeds: number;
  availableBeds: number;
  basePricePerNight: number;
  isPriceUnavailable: boolean;
  totalPrice: number;
  amenities: string[];
};

function apiBaseUrl() {
  return getApiBaseUrl();
}

function ensureString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function ensureNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function ensureArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function sanitizePropertyId(value: unknown): string {
  const raw = ensureString(value);
  return CANONICAL_PROPERTY_ID_REGEX.test(raw) ? raw : "";
}

function normalizeAvailabilitySource(value: unknown, fallback: AvailabilitySource): AvailabilitySource {
  const raw = ensureString(value).toLowerCase();

  if (
    raw === "catalog" ||
    raw === "ezee_live" ||
    raw === "live_provider" ||
    raw === "local_db_estimate" ||
    raw === "unknown"
  ) {
    return raw;
  }

  return fallback;
}

function formatDateDdMmYyyy(input: unknown) {
  const raw = ensureString(input);
  if (!raw) {
    return "TBA";
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "TBA";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function formatTime12Hour(value: unknown) {
  const raw = ensureString(value);
  if (!raw) {
    return "Details on arrival";
  }

  const [h, m] = raw.split(":");
  const hour = Number(h);
  const minute = Number(m);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return "Details on arrival";
  }

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function roomBadge(availableBeds: number, inventoryState: InventoryState, hasLiveAvailability: boolean) {
  if (!hasLiveAvailability || inventoryState === "unknown") {
    return undefined;
  }

  if (inventoryState === "sold_out") {
    return { label: "Sold Out", color: "#6b7280" };
  }

  if (inventoryState === "limited") {
    return { label: `Only ${Math.max(1, availableBeds)} left`, color: "#f59e0b", textColor: "#0f172a" };
  }

  return undefined;
}

async function fetchUnknownJson(path: string): Promise<unknown> {
  const url = `${apiBaseUrl()}${path}`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    if (!text.trim()) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function fallbackEvents(count = 3): EventCardProps[] {
  return Array.from({ length: count }, (_, index) => ({
    title: index === 0 ? "Details TBA" : `Experience Drop ${index + 1}`,
    description: "Event details will be available from API soon. Stay tuned for full lineup info.",
    date: "TBA",
    time: "Details on arrival",
    location: "The Daily Social",
    price: "Details on arrival",
    image: FALLBACK_EVENT_IMAGE,
    capacity: "Limited slots",
    href: "/events",
    badge: {
      label: "Stay Tuned",
      color: "#00d1ff",
      textColor: "#0f172a",
    },
  }));
}

function normalizeEvent(event: RawEvent): EventCardProps {
  const title = ensureString(event.title, "Details TBA");
  if (!event.title) recordTelemetry({ type: "missing_field", source: "event", field: "title" });

  const date = formatDateDdMmYyyy(event.date);
  if (!event.date) recordTelemetry({ type: "missing_field", source: "event", field: "date" });

  const time = formatTime12Hour(event.time);
  if (!event.time) recordTelemetry({ type: "missing_field", source: "event", field: "time" });

  const location = ensureString(event.location, "The Daily Social");
  if (!event.location) recordTelemetry({ type: "missing_field", source: "event", field: "location" });

  const price = ensureString(event.price_text, "Details on arrival");
  if (!event.price_text) recordTelemetry({ type: "missing_field", source: "event", field: "price_text" });

  const image = ensureString(event.poster_url, FALLBACK_EVENT_IMAGE);
  if (!event.poster_url) recordTelemetry({ type: "fallback_used", source: "event", field: "poster_url" });

  const capacityCount = ensureNumber(event.capacity, 0);
  const capacity = capacityCount > 0 ? `${capacityCount} guests` : "Limited slots";
  if (!event.capacity) recordTelemetry({ type: "missing_field", source: "event", field: "capacity" });

  const contact = ensureString(event.contact_link, "/events");
  const badgeLabel = ensureString(event.badge_label);
  const badgeColor = ensureString(event.badge_color, "#00d1ff");

  return {
    title,
    description: ensureString(event.description, "Event details will be available from API soon. Stay tuned for full lineup info."),
    date,
    time,
    location,
    price,
    image,
    capacity,
    href: contact.startsWith("http") ? contact : "/events",
    badge: badgeLabel
      ? {
          label: badgeLabel,
          color: badgeColor,
        }
      : undefined,
  };
}

export async function getPublicEvents(options?: {
  propertyId?: string;
  limit?: number;
}): Promise<EventCardProps[]> {
  const propertyId = ensureString(options?.propertyId);
  const limit = options?.limit;
  const path = propertyId
    ? `/public/events?property_id=${encodeURIComponent(propertyId)}`
    : "/public/events";
  const raw = await fetchUnknownJson(path);
  
  if (!raw) {
    recordTelemetry({ type: "null_payload", source: "event" });
  }

  const list = ensureArray(raw) as RawEvent[];

  if (list.length === 0) {
    recordTelemetry({ type: "empty_array", source: "event" });
  }

  const normalized = list.map(normalizeEvent);
  if (normalized.length === 0) {
    recordTelemetry({ type: "fallback_used", source: "event" });
    return fallbackEvents(limit ?? 3);
  }

  if (typeof limit === "number" && limit > 0) {
    return normalized.slice(0, limit);
  }

  return normalized;
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

function resolveInventoryState(input: RawRoomType, availableBeds: number, hasLiveAvailability: boolean): InventoryState {
  const rawState = ensureString(input.inventory_state).toLowerCase();
  if (rawState === "available" || rawState === "limited" || rawState === "sold_out") {
    return rawState;
  }

  if (!hasLiveAvailability) {
    return "unknown";
  }

  if (availableBeds <= 0) {
    return "sold_out";
  }

  if (availableBeds <= 2) {
    return "limited";
  }

  return "available";
}

function normalizeRoomType(
  input: RawRoomType,
  options?: {
    assumeLiveAvailability?: boolean;
  },
): NormalizedRoomType {
  const totalBeds = Math.max(0, ensureNumber(input.total_beds, 0));
  const hasAvailableBeds = hasValue(input.available_beds);
  const hasLiveAvailability = options?.assumeLiveAvailability === true || hasAvailableBeds;

  const availableBeds = Math.max(
    0,
    hasAvailableBeds
      ? ensureNumber(input.available_beds, 0)
      : hasLiveAvailability
        ? 0
        : totalBeds,
  );

  if (hasLiveAvailability && !hasAvailableBeds) {
    recordTelemetry({ type: "missing_field", source: "room", field: "available_beds" });
  }

  // When source === "db", the room data comes from our own seeded DB — prices are always
  // real numbers. We must NOT mark them as unavailable even if the raw value happens to be
  // 0 (which could occur during a data-seed gap). This eliminates the "Price unavailable" UI
  // that was caused by the eZee-only fallback path (source === "ezee_only").
  const isDbSource = ensureString(input.source).toLowerCase() === "db";

  const parsedBasePricePerNight = parseOptionalNumber(input.base_price_per_night);
  // For DB-sourced rooms, a valid price will always be present. For eZee-only rooms, null/0
  // is legitimate (no rate plan configured) and we keep the "unavailable" flag.
  const isPriceUnavailable = isDbSource
    ? false
    : (parsedBasePricePerNight === null || parsedBasePricePerNight <= 0);
  const basePricePerNight = Math.max(0, parsedBasePricePerNight ?? 0);
  if (parsedBasePricePerNight === null) {
    recordTelemetry({ type: "missing_field", source: "room", field: "base_price_per_night" });
  } else if (!isDbSource && parsedBasePricePerNight <= 0) {
    recordTelemetry({
      type: "fallback_used",
      source: "room",
      field: "non_positive_base_price_per_night",
      value: parsedBasePricePerNight,
    });
  }

  const parsedTotalPrice = parseOptionalNumber(input.total_price);
  const totalPrice = Math.max(basePricePerNight, parsedTotalPrice ?? basePricePerNight);
  if (parsedTotalPrice === null && hasLiveAvailability) {
    recordTelemetry({ type: "missing_field", source: "room", field: "total_price" });
  }

  const id = ensureString(input.id, `room-${Math.random().toString(36).slice(2, 8)}`);
  if (!hasValue(input.id)) {
    recordTelemetry({ type: "missing_field", source: "room", field: "id" });
  }

  const name = ensureString(input.name, "Room");
  const slug = ensureString(input.slug, ensureString(input.id, "room"));
  const amenities = ensureArray(input.amenities).map((item) => ensureString(item)).filter(Boolean);
  if (!hasValue(input.amenities) || amenities.length === 0) {
    recordTelemetry({ type: "missing_field", source: "room", field: "amenities" });
  }

  const inventoryState = resolveInventoryState(input, availableBeds, hasLiveAvailability);

  return {
    id,
    name,
    slug,
    type: ensureString(input.type, "ROOM"),
    inventoryState,
    hasLiveAvailability,
    bedsPerRoom: Math.max(1, ensureNumber(input.beds_per_room, 1)),
    totalBeds,
    availableBeds,
    basePricePerNight,
    isPriceUnavailable,
    totalPrice,
    amenities,
  };
}

function fallbackRoomTypes(): NormalizedRoomType[] {
  return [
    {
      id: "fallback-dorm",
      name: "Dorm Room",
      slug: "dorm-room",
      type: "DORM",
      inventoryState: "unknown",
      hasLiveAvailability: false,
      bedsPerRoom: 4,
      totalBeds: 0,
      availableBeds: 0,
      basePricePerNight: 599,
      isPriceUnavailable: false,
      totalPrice: 599,
      amenities: ["AC", "WiFi", "Locker"],
    },
    {
      id: "fallback-private",
      name: "Private Room",
      slug: "private-room",
      type: "PRIVATE",
      inventoryState: "unknown",
      hasLiveAvailability: false,
      bedsPerRoom: 1,
      totalBeds: 0,
      availableBeds: 0,
      basePricePerNight: 1299,
      isPriceUnavailable: false,
      totalPrice: 1299,
      amenities: ["AC", "WiFi", "Attached Bathroom"],
    },
  ];
}

export async function getRoomAvailability(options?: {
  propertyId?: string;
  checkin?: string;
  checkout?: string;
}): Promise<NormalizedRoomType[]> {
  const snapshot = await getRoomAvailabilitySnapshot(options);
  return snapshot.roomTypes;
}

export async function getRoomCatalog(options?: {
  propertyId?: string;
}): Promise<NormalizedRoomType[]> {
  const snapshot = await getRoomCatalogSnapshot(options);
  return snapshot.roomTypes;
}

export async function getRoomCatalogSnapshot(options?: {
  propertyId?: string;
}): Promise<RoomAvailabilitySnapshot> {
  const propertyId = sanitizePropertyId(options?.propertyId);

  async function fetchCatalog(includePropertyId: boolean) {
    const params = new URLSearchParams();

    if (includePropertyId && propertyId) {
      params.set("property_id", propertyId);
    }

    const path = params.size > 0
      ? `/guest/booking/rooms?${params.toString()}`
      : "/guest/booking/rooms";

    return (await fetchUnknownJson(path)) as RawRoomAvailability | null;
  }

  let raw = await fetchCatalog(true);
  let resolvedPropertyId = ensureString(raw?.property_id, propertyId);

  if (!raw) {
    recordTelemetry({ type: "null_payload", source: "room" });
  }

  let list = ensureArray(raw?.room_types) as RawRoomType[];

  if (propertyId && list.length === 0) {
    const retryRaw = await fetchCatalog(false);
    const retryList = ensureArray(retryRaw?.room_types) as RawRoomType[];

    if (retryList.length > 0) {
      raw = retryRaw;
      list = retryList;
      resolvedPropertyId = ensureString(retryRaw?.property_id, resolvedPropertyId);
    }
  }

  if (list.length === 0) {
    recordTelemetry({ type: "empty_array", source: "room" });
    return {
      propertyId: resolvedPropertyId,
      checkin: "",
      checkout: "",
      mode: "catalog",
      availabilitySource: "catalog",
      hasLiveAvailability: false,
      availabilityError: null,
      roomTypes: fallbackRoomTypes(),
    };
  }

  return {
    propertyId: resolvedPropertyId,
    checkin: "",
    checkout: "",
    mode: "catalog",
    availabilitySource: "catalog",
    hasLiveAvailability: false,
    availabilityError: null,
    roomTypes: list.map((room) => normalizeRoomType(room, { assumeLiveAvailability: false })),
  };
}

export async function getRoomAvailabilitySnapshot(options?: {
  propertyId?: string;
  checkin?: string;
  checkout?: string;
}): Promise<RoomAvailabilitySnapshot> {
  const propertyId = sanitizePropertyId(options?.propertyId);
  const checkin = ensureString(options?.checkin);
  const checkout = ensureString(options?.checkout);
  const catalogSnapshot = await getRoomCatalogSnapshot({ propertyId });

  const resolvedPropertyId = catalogSnapshot.propertyId || propertyId;
  const hasDateRange = Boolean(checkin && checkout);

  if (!hasDateRange) {
    return {
      ...catalogSnapshot,
      propertyId: resolvedPropertyId,
      checkin,
      checkout,
    };
  }

  async function fetchSnapshot(includePropertyId: boolean) {
    const params = new URLSearchParams({
      checkin,
      checkout,
    });

    if (includePropertyId && propertyId) {
      params.set("property_id", propertyId);
    }

    const path = `/guest/booking/availability?${params.toString()}`;
    return (await fetchUnknownJson(path)) as RawRoomAvailability | null;
  }

  let raw = await fetchSnapshot(true);
  let resolvedLivePropertyId = ensureString(raw?.property_id, resolvedPropertyId);
  let availabilitySource = normalizeAvailabilitySource(raw?.availability_source, "unknown");

  if (!raw) {
    recordTelemetry({ type: "null_payload", source: "room" });
  }

  let list = ensureArray(raw?.room_types) as RawRoomType[];

  if (propertyId && list.length === 0) {
    const retryRaw = await fetchSnapshot(false);
    const retryList = ensureArray(retryRaw?.room_types) as RawRoomType[];

    if (retryList.length > 0) {
      raw = retryRaw;
      list = retryList;
      resolvedLivePropertyId = ensureString(retryRaw?.property_id, resolvedLivePropertyId);
      availabilitySource = normalizeAvailabilitySource(retryRaw?.availability_source, "unknown");
    }
  }

  const catalogMapById = new Map(catalogSnapshot.roomTypes.map((room) => [room.id, room]));
  const catalogMapBySlug = new Map(catalogSnapshot.roomTypes.map((room) => [room.slug, room]));

  if (list.length === 0) {
    recordTelemetry({ type: "empty_array", source: "room" });

    const soldOutFallback = catalogSnapshot.roomTypes.map((room) => ({
      ...room,
      hasLiveAvailability: true,
      inventoryState: "sold_out" as const,
      availableBeds: 0,
      totalPrice: Math.max(room.basePricePerNight, room.totalPrice),
    }));

    return {
      propertyId: resolvedLivePropertyId,
      checkin,
      checkout,
      mode: "availability",
      availabilitySource,
      hasLiveAvailability: false,
      availabilityError: "Live availability is temporarily unavailable.",
      roomTypes: soldOutFallback,
    };
  }

  const liveRooms = list.map((room) => normalizeRoomType(room, { assumeLiveAvailability: true }));
  const liveMapById = new Map(liveRooms.map((room) => [room.id, room]));
  const liveMapBySlug = new Map(liveRooms.map((room) => [room.slug, room]));

  const mergedCatalog = catalogSnapshot.roomTypes.map((catalogRoom) => {
    const liveRoom = liveMapById.get(catalogRoom.id) || liveMapBySlug.get(catalogRoom.slug);

    if (!liveRoom) {
      recordTelemetry({
        type: "fallback_used",
        source: "room",
        field: "catalog_room_missing_in_availability",
        value: catalogRoom.id,
      });

      return {
        ...catalogRoom,
        hasLiveAvailability: true,
        inventoryState: "sold_out" as const,
        availableBeds: 0,
        totalPrice: Math.max(catalogRoom.basePricePerNight, catalogRoom.totalPrice),
      };
    }

    const resolvedBasePricePerNight =
      liveRoom.isPriceUnavailable && !catalogRoom.isPriceUnavailable
        ? catalogRoom.basePricePerNight
        : liveRoom.basePricePerNight;
    const resolvedTotalPrice =
      liveRoom.isPriceUnavailable && !catalogRoom.isPriceUnavailable
        ? Math.max(catalogRoom.totalPrice, resolvedBasePricePerNight)
        : liveRoom.totalPrice;

    return {
      ...catalogRoom,
      ...liveRoom,
      id: catalogRoom.id,
      slug: catalogRoom.slug,
      name: catalogRoom.name || liveRoom.name,
      type: catalogRoom.type || liveRoom.type,
      bedsPerRoom: Math.max(catalogRoom.bedsPerRoom, liveRoom.bedsPerRoom),
      totalBeds: Math.max(catalogRoom.totalBeds, liveRoom.totalBeds),
      basePricePerNight: resolvedBasePricePerNight,
      isPriceUnavailable: liveRoom.isPriceUnavailable && catalogRoom.isPriceUnavailable,
      totalPrice: Math.max(resolvedTotalPrice, resolvedBasePricePerNight),
      amenities: liveRoom.amenities.length > 0 ? liveRoom.amenities : catalogRoom.amenities,
    };
  });

  const liveOnlyRooms = liveRooms.filter(
    (room) => !catalogMapById.has(room.id) && !catalogMapBySlug.has(room.slug),
  );

  return {
    propertyId: resolvedLivePropertyId,
    checkin,
    checkout,
    mode: "availability",
    availabilitySource: normalizeAvailabilitySource(raw?.availability_source, "ezee_live"),
    hasLiveAvailability: true,
    availabilityError: null,
    roomTypes: [...mergedCatalog, ...liveOnlyRooms],
  };
}

export function roomTypesToHomeCards(
  roomTypes: NormalizedRoomType[],
  options?: { destinationHref?: string },
): RoomCardProps[] {
  return roomTypes.map((room, index) => {
    const occupancy = room.type.toUpperCase() === "PRIVATE"
      ? `${Math.max(room.bedsPerRoom, 1)} Guests`
      : `${Math.max(room.bedsPerRoom, 1)} Bed${room.bedsPerRoom > 1 ? "s" : ""}`;
    const images = pickStaticRoomGallery(room.slug || room.name, index);
    const presentation = getHardcodedRoomPresentation(room);

    // Price hierarchy:
    // 1. Live availability with a real price → show totalPrice (date-specific rate from eZee)
    //    with a "/night" suffix so users know it's date-aware.
    // 2. Catalog-only (no dates fetched, or availability endpoint down) → show basePricePerNight
    //    from the DB seed. The RoomCard label already says "Starting from".
    // 3. Both unavailable → hardcoded floor price so the card never shows "Price unavailable".
    let displayPrice: string;
    if (!room.isPriceUnavailable && room.hasLiveAvailability && room.totalPrice > 0) {
      // Live rate — use the nightly equivalent. eZee returns total_price as the full stay cost.
      // For a 1-night stay (today→tomorrow default) totalPrice === basePricePerNight.
      displayPrice = `₹${formatINRPlain(room.totalPrice)}/night`;
    } else if (!room.isPriceUnavailable && room.basePricePerNight > 0) {
      // Catalog price — no live rate, but we have a DB seed price.
      displayPrice = `₹${formatINRPlain(room.basePricePerNight)}`;
    } else {
      // Absolute fallback — never show "Price unavailable".
      displayPrice = room.type.toUpperCase() === "PRIVATE" ? `₹${formatINRPlain(1500)}` : `₹${formatINRPlain(500)}`;
    }

    return {
      title: room.name,
      price: displayPrice,
      occupancy,
      image: images[0] ?? FALLBACK_ROOM_IMAGE,
      images,
      badge: roomBadge(room.availableBeds, room.inventoryState, room.hasLiveAvailability),
      features: presentation.features,
      amenitiesLegend: presentation.amenitiesLegend,
      href: options?.destinationHref ?? "/property",
    };
  });
}

function inventoryLabel(
  availableBeds: number,
  totalBeds: number,
  type: string,
  inventoryState: InventoryState,
  hasLiveAvailability: boolean,
) {
  if (!hasLiveAvailability || inventoryState === "unknown") {
    return "Select dates to view live availability";
  }

  if (inventoryState === "sold_out" || availableBeds <= 0) {
    return "Sold out for selected dates";
  }

  if (type.toUpperCase() === "PRIVATE") {
    return `${availableBeds} rooms left`;
  }

  if (inventoryState === "limited") {
    return `Only ${availableBeds} beds left`;
  }

  if (totalBeds > 0) {
    return `${availableBeds} / ${totalBeds} beds available`;
  }

  return `${availableBeds} beds available`;
}

export function roomTypesToPropertyCategories(roomTypes: NormalizedRoomType[]): CxRoomCategory[] {
  return roomTypes.map((room, index) => {
    const images = pickStaticRoomGallery(room.slug || room.name, index);
    const presentation = getHardcodedRoomPresentation(room);

    return {
      roomTypeId: room.id,
      slug: room.slug || room.id,
      title: room.name,
      shortTitle: presentation.shortTitle,
      image: images[0] ?? FALLBACK_ROOM_IMAGE,
      images,
      roomType: room.type,
      inventoryState: room.inventoryState,
      hasLiveAvailability: room.hasLiveAvailability,
      guestText: presentation.guestText,
      basePrice: room.basePricePerNight,
      isPriceUnavailable: room.isPriceUnavailable,
      totalPrice: room.totalPrice,
      availableCount: room.availableBeds,
      totalCount: room.totalBeds,
      inventoryText: inventoryLabel(
        room.availableBeds,
        room.totalBeds,
        room.type,
        room.inventoryState,
        room.hasLiveAvailability,
      ),
      features: presentation.features,
      amenitiesLegend: presentation.amenitiesLegend,
    };
  });
}

export function getDefaultPropertyId() {
  const configured = process.env.NEXT_PUBLIC_PROPERTY_ID?.trim() || "";
  return sanitizePropertyId(configured) || DEFAULT_PROPERTY_ID;
}

/**
 * Returns the canonical property booking URL with today and tomorrow pre-filled as the
 * check-in / check-out dates unless explicit dates are provided. Every "Book Now" and
 * "View Details" link in the app should use this so the /property page always loads with
 * a valid date range and immediate live availability.
 */
export function getDefaultPropertyDestinationHref(
  propertyId?: string,
  basePath = "/property",
  checkin?: string | null,
  checkout?: string | null,
): string {
  const pid = sanitizePropertyId(propertyId ?? "") || getDefaultPropertyId();

  function localIsoDate(daysFromNow: number): string {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + daysFromNow);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const params = new URLSearchParams({
    checkin: checkin?.trim() || localIsoDate(0),
    checkout: checkout?.trim() || localIsoDate(1),
    property_id: pid,
  });

  return `${basePath}?${params.toString()}`;
}
