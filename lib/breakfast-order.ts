import type {
  BreakfastMenuItem,
  BreakfastPlate,
  BreakfastPlatePayload,
  BreakfastRoom,
  BreakfastRoomPayload,
  BreakfastSlot,
  BreakfastValidResponse,
} from "@/lib/breakfast-api";

export const MAX_BREAKFAST_REQUEST_LENGTH = 500;

export function getBreakfastErrorId(errorKey: string) {
  return `breakfast-error-${errorKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export type BreakfastPlateDraft = {
  slotId: string;
  quantities: Record<string, number>;
  specialRequests: string;
};

export type BreakfastRoomDraft = {
  ezeeReservationId: string;
  plates: BreakfastPlateDraft[];
};

export type BreakfastDraft = { rooms: BreakfastRoomDraft[] };
export type BreakfastDraftErrors = Record<string, string>;

export type BreakfastMenuGroups = {
  mains: BreakfastMenuItem[];
  addons: BreakfastMenuItem[];
  beverages: BreakfastMenuItem[];
};

function compareSortOrder<T extends { sort_order: number; id: string }>(a: T, b: T) {
  return a.sort_order - b.sort_order || a.id.localeCompare(b.id);
}

export function sortBreakfastMenu(menu: BreakfastMenuItem[]) { return [...menu].sort(compareSortOrder); }
export function sortBreakfastSlots(slots: BreakfastSlot[]) { return [...slots].sort(compareSortOrder); }
export function groupBreakfastMenu(menu: BreakfastMenuItem[]): BreakfastMenuGroups {
  const sorted = sortBreakfastMenu(menu);
  return {
    mains: sorted.filter((item) => item.category === "MAIN"),
    addons: sorted.filter((item) => item.category === "ADDON"),
    beverages: sorted.filter((item) => item.category === "BEVERAGE"),
  };
}

function createEmptyPlate(): BreakfastPlateDraft {
  return { slotId: "", quantities: {}, specialRequests: "" };
}

function plateToDraft(plate: BreakfastPlate): BreakfastPlateDraft {
  return {
    slotId: plate.slot_id,
    quantities: Object.fromEntries(plate.items.map((item) => [item.menu_item_id, item.qty])),
    specialRequests: plate.special_requests ?? "",
  };
}

export function createBreakfastDraft(response: BreakfastValidResponse): BreakfastDraft {
  return {
    rooms: response.rooms.map((room) => ({
      ezeeReservationId: room.ezee_reservation_id,
      plates: room.plates.length > 0
        ? room.plates.map(plateToDraft)
        : Array.from({ length: room.max_plates }, createEmptyPlate),
    })),
  };
}

export function getRoomDraft(draft: BreakfastDraft, reservationId: string) {
  return draft.rooms.find((room) => room.ezeeReservationId === reservationId);
}

export function addBreakfastPlate(draft: BreakfastDraft, room: BreakfastRoom): BreakfastDraft {
  return {
    rooms: draft.rooms.map((item) => item.ezeeReservationId === room.ezee_reservation_id && item.plates.length < room.max_plates
      ? { ...item, plates: [...item.plates, createEmptyPlate()] }
      : item),
  };
}

export function removeBreakfastPlate(draft: BreakfastDraft, reservationId: string, plateIndex: number): BreakfastDraft {
  return {
    rooms: draft.rooms.map((room) => room.ezeeReservationId === reservationId
      ? { ...room, plates: room.plates.filter((_, index) => index !== plateIndex) }
      : room),
  };
}

export function updateBreakfastPlate(draft: BreakfastDraft, reservationId: string, plateIndex: number, update: (plate: BreakfastPlateDraft) => BreakfastPlateDraft): BreakfastDraft {
  return {
    rooms: draft.rooms.map((room) => room.ezeeReservationId === reservationId
      ? { ...room, plates: room.plates.map((plate, index) => index === plateIndex ? update(plate) : plate) }
      : room),
  };
}

export function isBreakfastSlotAvailable(slot: BreakfastSlot, currentSlotId?: string) {
  return slot.remaining > 0 || slot.id === currentSlotId;
}

function plateKey(reservationId: string, plateIndex: number, field: string) {
  return `${reservationId}:${plateIndex}:${field}`;
}

export function validateBreakfastDraft(draft: BreakfastDraft, response: BreakfastValidResponse): { ok: boolean; errors: BreakfastDraftErrors; payload: { rooms: BreakfastRoomPayload[] } | null } {
  const errors: BreakfastDraftErrors = {};
  const menuIds = new Set(response.menu.map((item) => item.id));
  const mainIds = new Set(response.menu.filter((item) => item.category === "MAIN").map((item) => item.id));
  const rooms: BreakfastRoomPayload[] = [];

  for (const room of response.rooms) {
    const roomDraft = getRoomDraft(draft, room.ezee_reservation_id);
    if (!roomDraft || roomDraft.plates.length === 0) continue;
    if (roomDraft.plates.length > room.max_plates) {
      errors[`${room.ezee_reservation_id}:room`] = `Room ${room.room_number} allows at most ${room.max_plates} plates.`;
      continue;
    }

    const plates: BreakfastPlatePayload[] = roomDraft.plates.map((plate, plateIndex) => {
      const selectedMainCount = [...mainIds].filter((id) => (plate.quantities[id] ?? 0) > 0).length;
      if (selectedMainCount !== 1) errors[plateKey(room.ezee_reservation_id, plateIndex, "main")] = `Choose one main dish for Plate ${plateIndex + 1}.`;
      const currentSlotId = room.plates[plateIndex]?.slot_id;
      const slot = response.slots.find((item) => item.id === plate.slotId);
      if (!slot) errors[plateKey(room.ezee_reservation_id, plateIndex, "slot")] = "Choose a delivery slot.";
      else if (!isBreakfastSlotAvailable(slot, currentSlotId)) errors[plateKey(room.ezee_reservation_id, plateIndex, "slot")] = "This slot is full. Choose another time.";
      if (plate.specialRequests.length > MAX_BREAKFAST_REQUEST_LENGTH) errors[plateKey(room.ezee_reservation_id, plateIndex, "requests")] = `Keep requests within ${MAX_BREAKFAST_REQUEST_LENGTH} characters.`;

      const items = Object.entries(plate.quantities)
        .filter(([id, qty]) => menuIds.has(id) && Number.isInteger(qty) && qty > 0)
        .map(([menuItemId, qty]) => ({ menu_item_id: menuItemId, qty }));
      const requests = plate.specialRequests.trim();
      return { slot_id: plate.slotId, items, ...(requests ? { special_requests: requests } : {}) };
    });
    rooms.push({ ezee_reservation_id: room.ezee_reservation_id, action: "ORDER", plates });
  }

  if (rooms.length === 0) errors.form = "Add at least one plate, or skip breakfast for a room.";
  return Object.keys(errors).length > 0 ? { ok: false, errors, payload: null } : { ok: true, errors, payload: { rooms } };
}

export function buildPreviewRooms(response: BreakfastValidResponse, payloadRooms: BreakfastRoomPayload[]): BreakfastRoom[] {
  const menu = new Map(response.menu.map((item) => [item.id, item]));
  const slots = new Map(response.slots.map((slot) => [slot.id, slot]));
  const payload = new Map(payloadRooms.map((room) => [room.ezee_reservation_id, room]));
  return response.rooms.map((room) => {
    const update = payload.get(room.ezee_reservation_id);
    if (!update) return room;
    if (update.action === "SKIP") return { ...room, order_status: "SKIPPED", plates: [] };
    return {
      ...room,
      order_status: "PLACED",
      plates: (update.plates ?? []).map((plate, index) => ({
        plate_number: index + 1,
        slot_id: plate.slot_id,
        slot_label: slots.get(plate.slot_id)?.label ?? "Selected slot",
        status: "PLACED",
        special_requests: plate.special_requests ?? null,
        items: plate.items.map((item) => ({ menu_item_id: item.menu_item_id, name: menu.get(item.menu_item_id)?.name ?? "Menu item", qty: item.qty })),
      })),
    };
  });
}
