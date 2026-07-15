import type {
  BreakfastMenuItem,
  BreakfastPlate,
  BreakfastPlatePayload,
  BreakfastRoom,
  BreakfastRoomPayload,
  BreakfastSlot,
  BreakfastSubmitPayload,
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

export type BreakfastRoomIntent = "ORDER" | "SKIP";

export type BreakfastRoomDraft = {
  ezeeReservationId: string;
  intent: BreakfastRoomIntent;
  plates: BreakfastPlateDraft[];
};

export type BreakfastDraft = { rooms: BreakfastRoomDraft[] };
export type BreakfastDraftErrors = Record<string, string>;

export type BreakfastMenuGroups = {
  mains: BreakfastMenuItem[];
  addons: BreakfastMenuItem[];
  beverages: BreakfastMenuItem[];
};

export type BreakfastReceiptItem = {
  menuItemId: string;
  name: string;
  qty: number;
};

export type BreakfastReceiptPlate = {
  plateNumber: number;
  slotId: string;
  slotLabel: string;
  specialRequests: string | null;
  items: BreakfastReceiptItem[];
};

export type BreakfastReceiptRoom = {
  ezeeReservationId: string;
  roomNumber: string;
  guestCount: number;
  action: BreakfastRoomIntent;
  statusLabel: "Breakfast selected" | "Breakfast skipped";
  plates: BreakfastReceiptPlate[];
};

export type BreakfastOrderReview = {
  payload: BreakfastSubmitPayload;
  rooms: BreakfastReceiptRoom[];
};

function compareSortOrder<T extends { sort_order: number; id: string }>(a: T, b: T) {
  return a.sort_order - b.sort_order || a.id.localeCompare(b.id);
}

export function sortBreakfastMenu(menu: BreakfastMenuItem[]) { return [...menu].sort(compareSortOrder); }
export function sortBreakfastSlots(slots: BreakfastSlot[]) { return [...slots].sort(compareSortOrder); }
export function formatBreakfastSlotWindow(slot: Pick<BreakfastSlot, "start_min" | "end_min">) {
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
    const mins = (minutes % 60).toString().padStart(2, "0");
    return `${hours}:${mins}`;
  };

  return `${formatMinutes(slot.start_min)} - ${formatMinutes(slot.end_min)}`;
}
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
      intent: room.order_status === "SKIPPED" ? "SKIP" : "ORDER",
      plates: room.order_status === "SKIPPED"
        ? []
        : room.plates.length > 0
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
    rooms: draft.rooms.map((item) => item.ezeeReservationId === room.ezee_reservation_id && item.intent === "ORDER" && item.plates.length < room.max_plates
      ? { ...item, plates: [...item.plates, createEmptyPlate()] }
      : item),
  };
}

export function setBreakfastRoomIntent(draft: BreakfastDraft, room: BreakfastRoom, intent: BreakfastRoomIntent): BreakfastDraft {
  return {
    rooms: draft.rooms.map((item) => {
      if (item.ezeeReservationId !== room.ezee_reservation_id) return item;
      if (intent === "ORDER" && item.plates.length === 0) {
        return { ...item, intent, plates: Array.from({ length: room.max_plates }, createEmptyPlate) };
      }
      return { ...item, intent };
    }),
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

export function isBreakfastSlotSelectable(
  slotId: string,
  reservationId: string,
  plateIndex: number,
  draft: BreakfastDraft,
  response: BreakfastValidResponse,
) {
  const slot = response.slots.find((item) => item.id === slotId);
  if (!slot) return false;
  const includedRoomIds = new Set(draft.rooms.map((room) => room.ezeeReservationId));
  const savedCount = response.rooms.reduce((count, room) => {
    if (!includedRoomIds.has(room.ezee_reservation_id)) return count;
    return count + room.plates.filter((plate) => plate.slot_id === slotId).length;
  }, 0);
  const otherRequestedCount = draft.rooms.reduce((count, room) => {
    if (room.intent === "SKIP") return count;
    return count + room.plates.filter((plate, index) => {
      const isEditedPlate = room.ezeeReservationId === reservationId && index === plateIndex;
      return !isEditedPlate && plate.slotId === slotId;
    }).length;
  }, 0);
  return otherRequestedCount < slot.remaining + savedCount;
}

function plateKey(reservationId: string, plateIndex: number, field: string) {
  return `${reservationId}:${plateIndex}:${field}`;
}

export function validateBreakfastDraft(draft: BreakfastDraft, response: BreakfastValidResponse): { ok: boolean; errors: BreakfastDraftErrors; payload: BreakfastSubmitPayload | null } {
  const errors: BreakfastDraftErrors = {};
  const menuIds = new Set(response.menu.map((item) => item.id));
  const mainIds = new Set(response.menu.filter((item) => item.category === "MAIN").map((item) => item.id));
  const rooms: BreakfastRoomPayload[] = [];
  const requestedSlots = new Map<string, Array<{ reservationId: string; plateIndex: number }>>();
  const includedRoomIds = new Set(draft.rooms.map((room) => room.ezeeReservationId));
  const savedSlotCounts = new Map<string, number>();

  for (const room of response.rooms) {
    if (!includedRoomIds.has(room.ezee_reservation_id)) continue;
    for (const plate of room.plates) savedSlotCounts.set(plate.slot_id, (savedSlotCounts.get(plate.slot_id) ?? 0) + 1);
  }

  for (const room of response.rooms) {
    const roomDraft = getRoomDraft(draft, room.ezee_reservation_id);
    if (!roomDraft) {
      errors[`${room.ezee_reservation_id}:room`] = `Choose breakfast or skip it for Room ${room.room_number}.`;
      continue;
    }
    if (roomDraft.intent === "SKIP") {
      rooms.push({ ezee_reservation_id: room.ezee_reservation_id, action: "SKIP" });
      continue;
    }
    if (roomDraft.plates.length === 0) {
      errors[`${room.ezee_reservation_id}:room`] = `Add at least one plate for Room ${room.room_number}, or skip breakfast.`;
      continue;
    }
    if (roomDraft.plates.length > room.max_plates) {
      errors[`${room.ezee_reservation_id}:room`] = `Room ${room.room_number} allows at most ${room.max_plates} plates.`;
      continue;
    }

    const plates: BreakfastPlatePayload[] = roomDraft.plates.map((plate, plateIndex) => {
      const selectedMainCount = [...mainIds].filter((id) => (plate.quantities[id] ?? 0) > 0).length;
      if (selectedMainCount !== 1) errors[plateKey(room.ezee_reservation_id, plateIndex, "main")] = `Choose one main dish for Plate ${plateIndex + 1}.`;
      const slot = response.slots.find((item) => item.id === plate.slotId);
      if (!slot) errors[plateKey(room.ezee_reservation_id, plateIndex, "slot")] = "Choose a delivery slot.";
      else {
        const requested = requestedSlots.get(slot.id) ?? [];
        requested.push({ reservationId: room.ezee_reservation_id, plateIndex });
        requestedSlots.set(slot.id, requested);
      }
      if (plate.specialRequests.length > MAX_BREAKFAST_REQUEST_LENGTH) errors[plateKey(room.ezee_reservation_id, plateIndex, "requests")] = `Keep requests within ${MAX_BREAKFAST_REQUEST_LENGTH} characters.`;

      const items = Object.entries(plate.quantities)
        .filter(([id, qty]) => menuIds.has(id) && Number.isInteger(qty) && qty > 0)
        .map(([menuItemId, qty]) => ({ menu_item_id: menuItemId, qty }));
      const requests = plate.specialRequests.trim();
      return { slot_id: plate.slotId, items, ...(requests ? { special_requests: requests } : {}) };
    });
    rooms.push({ ezee_reservation_id: room.ezee_reservation_id, action: "ORDER", plates });
  }

  for (const [slotId, requested] of requestedSlots) {
    const slot = response.slots.find((item) => item.id === slotId);
    if (!slot) continue;
    const effectiveAvailability = slot.remaining + (savedSlotCounts.get(slotId) ?? 0);
    if (requested.length <= effectiveAvailability) continue;
    for (const plate of requested) {
      errors[plateKey(plate.reservationId, plate.plateIndex, "slot")] = "This slot does not have enough space for all selected plates. Choose another time.";
    }
  }

  if (rooms.length === 0) errors.form = "Choose breakfast or skip it for each room.";
  return Object.keys(errors).length > 0 ? { ok: false, errors, payload: null } : { ok: true, errors, payload: { rooms } };
}

function captureBreakfastPayload(payload: BreakfastSubmitPayload): BreakfastSubmitPayload {
  return {
    rooms: payload.rooms.map((room) => ({
      ezee_reservation_id: room.ezee_reservation_id,
      action: room.action,
      ...(room.action === "ORDER"
        ? {
            plates: (room.plates ?? []).map((plate) => ({
              slot_id: plate.slot_id,
              items: plate.items.map((item) => ({ ...item })),
              ...(plate.special_requests ? { special_requests: plate.special_requests } : {}),
            })),
          }
        : {}),
    })),
  };
}

export function buildBreakfastOrderReview(response: BreakfastValidResponse, payload: BreakfastSubmitPayload): BreakfastOrderReview {
  const capturedPayload = captureBreakfastPayload(payload);
  const menu = new Map(response.menu.map((item) => [item.id, item]));
  const slots = new Map(response.slots.map((slot) => [slot.id, slot]));
  const sourceRooms = new Map(response.rooms.map((room) => [room.ezee_reservation_id, room]));
  return {
    payload: capturedPayload,
    rooms: capturedPayload.rooms.map((payloadRoom) => {
      const sourceRoom = sourceRooms.get(payloadRoom.ezee_reservation_id);
      return {
        ezeeReservationId: payloadRoom.ezee_reservation_id,
        roomNumber: sourceRoom?.room_number ?? "Room",
        guestCount: sourceRoom?.max_plates ?? payloadRoom.plates?.length ?? 0,
        action: payloadRoom.action,
        statusLabel: payloadRoom.action === "SKIP" ? "Breakfast skipped" : "Breakfast selected",
        plates: payloadRoom.action === "SKIP"
          ? []
          : (payloadRoom.plates ?? []).map((plate, index) => {
              const slot = slots.get(plate.slot_id);
              return {
                plateNumber: index + 1,
                slotId: plate.slot_id,
                slotLabel: slot ? formatBreakfastSlotWindow(slot) : "Selected slot",
                specialRequests: plate.special_requests ?? null,
                items: plate.items.map((item) => ({
                  menuItemId: item.menu_item_id,
                  name: menu.get(item.menu_item_id)?.name ?? "Menu item",
                  qty: item.qty,
                })),
              };
            }),
      };
    }),
  };
}

function comparableItems(items: Array<{ menu_item_id: string; qty: number }>) {
  return [...items]
    .map((item) => `${item.menu_item_id}:${item.qty}`)
    .sort();
}

export function doesBreakfastLookupMatchPayload(response: BreakfastValidResponse, payload: BreakfastSubmitPayload): boolean {
  if (payload.rooms.length === 0) return false;
  const roomsById = new Map(response.rooms.map((room) => [room.ezee_reservation_id, room]));
  const payloadRoomIds = new Set<string>();

  return payload.rooms.every((payloadRoom) => {
    if (payloadRoomIds.has(payloadRoom.ezee_reservation_id)) return false;
    payloadRoomIds.add(payloadRoom.ezee_reservation_id);
    const room = roomsById.get(payloadRoom.ezee_reservation_id);
    if (!room) return false;
    if (payloadRoom.action === "SKIP") return room.order_status === "SKIPPED" && room.plates.length === 0;
    if (room.order_status !== "PLACED" || room.plates.length !== (payloadRoom.plates?.length ?? 0)) return false;

    const savedPlates = [...room.plates].sort((a, b) => a.plate_number - b.plate_number);
    return (payloadRoom.plates ?? []).every((plate, index) => {
      const saved = savedPlates[index];
      if (!saved || saved.slot_id !== plate.slot_id) return false;
      if ((saved.special_requests?.trim() ?? "") !== (plate.special_requests?.trim() ?? "")) return false;
      const savedItems = comparableItems(saved.items.map((item) => ({ menu_item_id: item.menu_item_id, qty: item.qty })));
      const payloadItems = comparableItems(plate.items);
      return savedItems.length === payloadItems.length && savedItems.every((item, itemIndex) => item === payloadItems[itemIndex]);
    });
  });
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
      plates: (update.plates ?? []).map((plate, index) => {
        const slot = slots.get(plate.slot_id);
        return {
          plate_number: index + 1,
          slot_id: plate.slot_id,
          slot_label: slot ? formatBreakfastSlotWindow(slot) : "Selected slot",
          status: "PLACED",
          special_requests: plate.special_requests ?? null,
          items: plate.items.map((item) => ({ menu_item_id: item.menu_item_id, name: menu.get(item.menu_item_id)?.name ?? "Menu item", qty: item.qty })),
        };
      }),
    };
  });
}
