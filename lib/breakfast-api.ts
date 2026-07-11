import { getApiBaseUrl, getRequestContextHeaders, parseApiError } from "@/lib/vibehouse-api";

export type BreakfastBrand = "BUTEAK" | "TDS";
export type BreakfastLinkState = "valid" | "disabled" | "checked_out" | "revoked" | "not_found";
export type BreakfastWindowState = "open" | "frozen";
export type BreakfastMenuCategory = "MAIN" | "ADDON" | "BEVERAGE";

export type BreakfastWindow = {
  state: BreakfastWindowState;
  service_date: string;
  opens_at_ist: string;
  closes_at_ist: string;
};

export type BreakfastMenuItem = {
  id: string;
  name: string;
  description: string;
  category: BreakfastMenuCategory;
  is_veg: boolean;
  sort_order: number;
};

export type BreakfastSlot = {
  id: string;
  slot_number: number;
  label: string;
  start_min: number;
  end_min: number;
  capacity: number;
  booked: number;
  remaining: number;
  sort_order: number;
};

export type BreakfastOrderItem = { menu_item_id: string; name: string; qty: number };

export type BreakfastPlate = {
  plate_number: number;
  slot_id: string;
  slot_label: string;
  status: string;
  special_requests: string | null;
  items: BreakfastOrderItem[];
};

export type BreakfastRoom = {
  ezee_reservation_id: string;
  room_number: string;
  max_plates: number;
  order_status: "PLACED" | "SKIPPED" | null;
  plates: BreakfastPlate[];
};

export type BreakfastTerminalResponse = {
  link_state: Exclude<BreakfastLinkState, "valid">;
  brand?: BreakfastBrand;
};

export type BreakfastValidResponse = {
  link_state: "valid";
  window: BreakfastWindow;
  brand: BreakfastBrand;
  total_adults: number;
  rooms: BreakfastRoom[];
  menu: BreakfastMenuItem[];
  slots: BreakfastSlot[];
};

export type BreakfastLookupResponse = BreakfastTerminalResponse | BreakfastValidResponse;

export type BreakfastPlatePayload = {
  slot_id: string;
  items: Array<{ menu_item_id: string; qty: number }>;
  special_requests?: string;
};

export type BreakfastRoomPayload = {
  ezee_reservation_id: string;
  action: "ORDER" | "SKIP";
  plates?: BreakfastPlatePayload[];
};

export type BreakfastSubmitPayload = { rooms: BreakfastRoomPayload[] };
export type BreakfastSubmitResponse = { ok: true; rooms: BreakfastRoom[] };

export type BreakfastErrorPayload = {
  ok?: false;
  error?: string;
  link_state?: Exclude<BreakfastLinkState, "valid">;
  window?: BreakfastWindow;
  slots?: BreakfastSlot[];
  message?: string;
};

export type BreakfastRequestResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; data: BreakfastErrorPayload | null; message: string; retryable: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown, minimum = 0): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum;
}

function isBrand(value: unknown): value is BreakfastBrand { return value === "BUTEAK" || value === "TDS"; }
function isTerminalState(value: unknown): value is Exclude<BreakfastLinkState, "valid"> {
  return value === "disabled" || value === "checked_out" || value === "revoked" || value === "not_found";
}

function normalizeWindow(value: unknown): BreakfastWindow | null {
  if (!isRecord(value)) return null;
  if ((value.state !== "open" && value.state !== "frozen") || typeof value.service_date !== "string" || typeof value.opens_at_ist !== "string" || typeof value.closes_at_ist !== "string") return null;
  return { state: value.state, service_date: value.service_date, opens_at_ist: value.opens_at_ist, closes_at_ist: value.closes_at_ist };
}

function normalizeMenuItem(value: unknown): BreakfastMenuItem | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.name !== "string" || (typeof value.description !== "string" && value.description != null) || (value.category !== "MAIN" && value.category !== "ADDON" && value.category !== "BEVERAGE") || typeof value.is_veg !== "boolean" || typeof value.sort_order !== "number") return null;
  return { id: value.id, name: value.name, description: typeof value.description === "string" ? value.description : "", category: value.category, is_veg: value.is_veg, sort_order: value.sort_order };
}

function normalizeSlot(value: unknown): BreakfastSlot | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.label !== "string" || !isInteger(value.slot_number) || !isInteger(value.start_min) || !isInteger(value.end_min) || !isInteger(value.capacity) || !isInteger(value.booked) || !isInteger(value.remaining) || typeof value.sort_order !== "number") return null;
  return { id: value.id, label: value.label, slot_number: value.slot_number, start_min: value.start_min, end_min: value.end_min, capacity: value.capacity, booked: value.booked, remaining: value.remaining, sort_order: value.sort_order };
}

function normalizeOrderItem(value: unknown): BreakfastOrderItem | null {
  if (!isRecord(value) || typeof value.menu_item_id !== "string" || typeof value.name !== "string" || !isInteger(value.qty, 1)) return null;
  return { menu_item_id: value.menu_item_id, name: value.name, qty: value.qty };
}

function normalizePlate(value: unknown): BreakfastPlate | null {
  if (!isRecord(value) || !Array.isArray(value.items) || !isInteger(value.plate_number, 1) || typeof value.slot_id !== "string" || typeof value.slot_label !== "string" || typeof value.status !== "string" || (typeof value.special_requests !== "string" && value.special_requests !== null && value.special_requests !== undefined)) return null;
  const items = value.items.map(normalizeOrderItem);
  if (items.some((item) => item === null)) return null;
  return { plate_number: value.plate_number, slot_id: value.slot_id, slot_label: value.slot_label, status: value.status, special_requests: typeof value.special_requests === "string" ? value.special_requests : null, items: items as BreakfastOrderItem[] };
}

export function normalizeBreakfastRoom(value: unknown): BreakfastRoom | null {
  if (!isRecord(value) || !Array.isArray(value.plates) || typeof value.ezee_reservation_id !== "string" || typeof value.room_number !== "string" || !isInteger(value.max_plates, 1) || (value.order_status !== "PLACED" && value.order_status !== "SKIPPED" && value.order_status !== null && value.order_status !== undefined)) return null;
  const plates = value.plates.map(normalizePlate);
  if (plates.some((plate) => plate === null) || plates.length > value.max_plates) return null;
  return { ezee_reservation_id: value.ezee_reservation_id, room_number: value.room_number, max_plates: value.max_plates, order_status: value.order_status ?? null, plates: plates as BreakfastPlate[] };
}

export function normalizeBreakfastLookup(value: unknown): BreakfastLookupResponse | null {
  if (!isRecord(value)) return null;
  if (isTerminalState(value.link_state)) return { link_state: value.link_state, ...(isBrand(value.brand) ? { brand: value.brand } : {}) };
  if (value.link_state !== "valid" || !isBrand(value.brand) || !Array.isArray(value.rooms) || !Array.isArray(value.menu) || !Array.isArray(value.slots) || !isInteger(value.total_adults, 1)) return null;
  const window = normalizeWindow(value.window);
  const rooms = value.rooms.map(normalizeBreakfastRoom);
  const menu = value.menu.map(normalizeMenuItem);
  const slots = value.slots.map(normalizeSlot);
  if (!window || rooms.some((room) => room === null) || menu.some((item) => item === null) || slots.some((slot) => slot === null)) return null;
  return { link_state: "valid", window, brand: value.brand, total_adults: value.total_adults, rooms: rooms as BreakfastRoom[], menu: menu as BreakfastMenuItem[], slots: slots as BreakfastSlot[] };
}

function normalizeSubmitResponse(value: unknown): BreakfastSubmitResponse | null {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.rooms)) return null;
  const rooms = value.rooms.map(normalizeBreakfastRoom);
  return rooms.every((room) => room !== null) ? { ok: true, rooms: rooms as BreakfastRoom[] } : null;
}

function normalizeErrorPayload(value: unknown): BreakfastErrorPayload | null {
  if (!isRecord(value)) return null;
  const window = normalizeWindow(value.window);
  const slots = Array.isArray(value.slots) ? value.slots.map(normalizeSlot) : [];
  const message = Array.isArray(value.message) ? value.message.filter((item): item is string => typeof item === "string").join(". ") : typeof value.message === "string" ? value.message : undefined;
  return { ...(value.ok === false ? { ok: false as const } : {}), ...(typeof value.error === "string" ? { error: value.error } : {}), ...(isTerminalState(value.link_state) ? { link_state: value.link_state } : {}), ...(window ? { window } : {}), ...(slots.length > 0 && slots.every(Boolean) ? { slots: slots as BreakfastSlot[] } : {}), ...(message ? { message } : {}) };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function requestBreakfast<T>(token: string, normalize: (value: unknown) => T | null, options: { method?: "GET" | "POST"; body?: BreakfastSubmitPayload; signal?: AbortSignal } = {}): Promise<BreakfastRequestResult<T>> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/public/breakfast/${encodeURIComponent(token)}`, {
      method: options.method ?? "GET",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...getRequestContextHeaders() },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: options.signal,
    });
    const raw = await readJson(response);
    if (response.ok) {
      const data = normalize(raw);
      return data ? { ok: true, status: response.status, data } : { ok: false, status: response.status, data: null, message: "The breakfast service returned an unexpected response. Please try again.", retryable: true };
    }
    const data = normalizeErrorPayload(raw);
    return { ok: false, status: response.status, data, message: data?.message ?? parseApiError(raw, "Request failed. Please try again."), retryable: response.status >= 500 };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, status: 0, data: null, message: "We couldn't reach the breakfast service. Check your connection and try again.", retryable: true };
  }
}

export function getPublicBreakfast(token: string, signal?: AbortSignal) {
  return requestBreakfast(token, normalizeBreakfastLookup, { signal });
}

export function submitPublicBreakfast(token: string, payload: BreakfastSubmitPayload, signal?: AbortSignal) {
  return requestBreakfast(token, normalizeSubmitResponse, { method: "POST", body: payload, signal });
}
