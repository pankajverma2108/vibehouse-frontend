import { describe, expect, it } from "vitest";

import { addBreakfastPlate, buildPreviewRooms, createBreakfastDraft, validateBreakfastDraft } from "@/lib/breakfast-order";
import { createBreakfastFixture } from "@/test/breakfast-fixture";

describe("breakfast order helpers", () => {
  it("starts an unplaced room with one plate per backend adult", () => {
    const draft = createBreakfastDraft(createBreakfastFixture());
    expect(draft.rooms.map((room) => room.plates.length)).toEqual([2, 1]);
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
    expect(createBreakfastDraft(response).rooms[0].plates[0]).toEqual({ slotId: "slot-730", quantities: { "main-dosa": 1 }, specialRequests: "" });
  });

  it("simulates preview submit without mutating the source response", () => {
    const response = createBreakfastFixture();
    const rooms = buildPreviewRooms(response, [{ ezee_reservation_id: "reservation-404", action: "SKIP" }]);
    expect(rooms[0].order_status).toBe("SKIPPED");
    expect(response.rooms[0].order_status).toBeNull();
  });
});
