import { describe, expect, it } from "vitest";

import {
  addBreakfastPlate,
  buildBreakfastOrderReview,
  buildPreviewRooms,
  createBreakfastDraft,
  doesBreakfastLookupMatchPayload,
  isBreakfastSlotSelectable,
  removeBreakfastPlate,
  setBreakfastRoomIntent,
  validateBreakfastDraft,
} from "@/lib/breakfast-order";
import { createBreakfastFixture } from "@/test/breakfast-fixture";

describe("breakfast order helpers", () => {
  it("starts an unplaced room with one plate per backend adult", () => {
    const draft = createBreakfastDraft(createBreakfastFixture());
    expect(draft.rooms.map((room) => room.plates.length)).toEqual([2, 1]);
    expect(draft.rooms.map((room) => room.intent)).toEqual(["ORDER", "ORDER"]);
  });

  it("caps added plates at room max_plates", () => {
    const response = createBreakfastFixture();
    const once = addBreakfastPlate(createBreakfastDraft(response), response.rooms[0]);
    const twice = addBreakfastPlate(once, response.rooms[0]);
    expect(twice.rooms[0].plates).toHaveLength(2);
  });

  it("builds independent per-room and per-plate payloads", () => {
    const response = createBreakfastFixture();
    const draft = createBreakfastDraft(response);
    draft.rooms[0].plates[0] = { slotId: "slot-730", quantities: { "main-dosa": 1, "addon-fruit": 2 }, specialRequests: "No onion" };
    draft.rooms[0].plates[1] = { slotId: "slot-730", quantities: { "main-omelette": 1 }, specialRequests: "" };
    draft.rooms[1].plates[0] = { slotId: "slot-730", quantities: { "main-omelette": 1 }, specialRequests: "" };
    const result = validateBreakfastDraft(draft, response);
    expect(result.ok).toBe(true);
    expect(result.payload?.rooms).toHaveLength(2);
    expect(result.payload?.rooms[0].plates?.[0]).toMatchObject({ slot_id: "slot-730", special_requests: "No onion", items: expect.arrayContaining([{ menu_item_id: "addon-fruit", qty: 2 }]) });
  });

  it("stages a per-room skip in the payload without discarding the other room", () => {
    const response = createBreakfastFixture();
    let draft = createBreakfastDraft(response);
    draft = setBreakfastRoomIntent(draft, response.rooms[1], "SKIP");
    draft.rooms[0].plates[0] = { slotId: "slot-730", quantities: { "main-dosa": 1 }, specialRequests: "" };
    draft.rooms[0].plates[1] = { slotId: "slot-730", quantities: { "main-omelette": 1 }, specialRequests: "" };

    const result = validateBreakfastDraft(draft, response);

    expect(result.ok).toBe(true);
    expect(result.payload?.rooms).toEqual([
      expect.objectContaining({ ezee_reservation_id: "reservation-404", action: "ORDER" }),
      { ezee_reservation_id: "reservation-405", action: "SKIP" },
    ]);
  });

  it("requires at least one plate for every room that intends to order", () => {
    const response = createBreakfastFixture();
    const draft = removeBreakfastPlate(removeBreakfastPlate(createBreakfastDraft(response), "reservation-404", 1), "reservation-404", 0);
    const result = validateBreakfastDraft(draft, response);

    expect(result.ok).toBe(false);
    expect(result.errors["reservation-404:room"]).toBe("Add at least one plate for Room 404, or skip breakfast.");
  });

  it("reports plate-specific main and slot errors", () => {
    const response = createBreakfastFixture();
    const result = validateBreakfastDraft(createBreakfastDraft(response), response);
    expect(result.ok).toBe(false);
    expect(Object.values(result.errors)).toContain("Choose one main dish for Plate 1.");
    expect(Object.values(result.errors)).toContain("Choose a delivery slot.");
  });

  it("rehydrates existing backend plates without aggregating them", () => {
    const response = createBreakfastFixture();
    response.rooms[0].order_status = "PLACED";
    response.rooms[0].plates = [{ plate_number: 1, slot_id: "slot-730", slot_label: "7:30 - 8:00 AM", status: "PLACED", special_requests: null, items: [{ menu_item_id: "main-dosa", name: "Masala Dosa", qty: 1 }] }];
    expect(createBreakfastDraft(response).rooms[0]).toMatchObject({
      intent: "ORDER",
      plates: [{ slotId: "slot-730", quantities: { "main-dosa": 1 }, specialRequests: "" }],
    });
  });

  it("reclaims saved plate capacity before validating the full rewrite", () => {
    const response = createBreakfastFixture();
    response.slots[0].remaining = 0;
    response.rooms[0].order_status = "PLACED";
    response.rooms[0].plates = [
      { plate_number: 1, slot_id: "slot-730", slot_label: "7:30 - 8:00 AM", status: "PLACED", special_requests: null, items: [{ menu_item_id: "main-dosa", name: "Masala Dosa", qty: 1 }] },
      { plate_number: 2, slot_id: "slot-730", slot_label: "7:30 - 8:00 AM", status: "PLACED", special_requests: null, items: [{ menu_item_id: "main-omelette", name: "Plain Omelette", qty: 1 }] },
    ];
    response.rooms[1].order_status = "SKIPPED";

    expect(validateBreakfastDraft(createBreakfastDraft(response), response).ok).toBe(true);
  });

  it("reports aggregate slot conflicts across rooms", () => {
    const response = createBreakfastFixture();
    response.slots[0].remaining = 2;
    const draft = createBreakfastDraft(response);
    for (const room of draft.rooms) {
      for (const plate of room.plates) {
        plate.slotId = "slot-730";
        plate.quantities = { "main-dosa": 1 };
      }
    }

    const result = validateBreakfastDraft(draft, response);

    expect(result.ok).toBe(false);
    expect(result.errors["reservation-404:0:slot"]).toContain("enough space");
    expect(result.errors["reservation-405:0:slot"]).toContain("enough space");
  });

  it("makes draft slot options account for saved capacity reclaimed across rooms", () => {
    const response = createBreakfastFixture();
    response.slots[0].remaining = 0;
    response.rooms[0].order_status = "PLACED";
    response.rooms[0].plates = [
      { plate_number: 1, slot_id: "slot-730", slot_label: "7:30 - 8:00 AM", status: "PLACED", special_requests: null, items: [{ menu_item_id: "main-dosa", name: "Masala Dosa", qty: 1 }] },
    ];
    const draft = createBreakfastDraft(response);
    draft.rooms[0].plates[0].slotId = "slot-800";

    expect(isBreakfastSlotSelectable("slot-730", "reservation-405", 0, draft, response)).toBe(true);
    draft.rooms[0].plates[0].slotId = "slot-730";
    expect(isBreakfastSlotSelectable("slot-730", "reservation-405", 0, draft, response)).toBe(false);
  });

  it("builds an immutable review receipt for unsaved orders and skips", () => {
    const response = createBreakfastFixture();
    const payload = {
      rooms: [
        { ezee_reservation_id: "reservation-404", action: "ORDER" as const, plates: [{ slot_id: "slot-730", items: [{ menu_item_id: "main-dosa", qty: 1 }], special_requests: "No onion" }] },
        { ezee_reservation_id: "reservation-405", action: "SKIP" as const },
      ],
    };

    const review = buildBreakfastOrderReview(response, payload);
    payload.rooms[0].plates![0].items[0].qty = 9;

    expect(review.rooms[0]).toMatchObject({ roomNumber: "404", guestCount: 2, action: "ORDER", statusLabel: "Breakfast selected" });
    expect(review.rooms[0].plates[0]).toMatchObject({ plateNumber: 1, slotLabel: "7:30 - 8:00 AM", specialRequests: "No onion", items: [{ name: "Masala Dosa", qty: 1 }] });
    expect(review.rooms[1]).toMatchObject({ roomNumber: "405", action: "SKIP", statusLabel: "Breakfast skipped", plates: [] });
    expect(review.payload.rooms[0].plates?.[0].items[0].qty).toBe(1);
  });

  it("matches a refreshed lookup to the exact submitted room payload", () => {
    const response = createBreakfastFixture();
    const payload = {
      rooms: [
        { ezee_reservation_id: "reservation-404", action: "ORDER" as const, plates: [{ slot_id: "slot-730", items: [{ menu_item_id: "main-dosa", qty: 1 }], special_requests: "No onion" }] },
        { ezee_reservation_id: "reservation-405", action: "SKIP" as const },
      ],
    };
    const refreshed = { ...response, rooms: buildPreviewRooms(response, payload.rooms) };

    expect(doesBreakfastLookupMatchPayload(refreshed, payload)).toBe(true);
    refreshed.rooms[0].plates[0].slot_id = "slot-800";
    expect(doesBreakfastLookupMatchPayload(refreshed, payload)).toBe(false);
  });

  it("simulates preview submit without mutating the source response", () => {
    const response = createBreakfastFixture();
    const rooms = buildPreviewRooms(response, [{ ezee_reservation_id: "reservation-404", action: "SKIP" }]);
    expect(rooms[0].order_status).toBe("SKIPPED");
    expect(response.rooms[0].order_status).toBeNull();
  });
});
