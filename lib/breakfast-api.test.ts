import { describe, expect, it } from "vitest";

import { normalizeBreakfastLookup, normalizeBreakfastRoom } from "@/lib/breakfast-api";
import { createBreakfastFixture } from "@/test/breakfast-fixture";

describe("breakfast API normalization", () => {
  it("accepts the documented multi-room, per-plate lookup", () => {
    const response = createBreakfastFixture();
    expect(normalizeBreakfastLookup(response)).toEqual(response);
  });

  it("accepts a placed room with independent plate slots", () => {
    const room = {
      ezee_reservation_id: "reservation-404", room_number: "404", max_plates: 2, order_status: "PLACED",
      plates: [
        { plate_number: 1, slot_id: "slot-730", slot_label: "7:30 - 8:00 AM", status: "PLACED", special_requests: "No onion", items: [{ menu_item_id: "main-dosa", name: "Masala Dosa", qty: 1 }] },
        { plate_number: 2, slot_id: "slot-800", slot_label: "8:00 - 8:30 AM", status: "PLACED", special_requests: null, items: [{ menu_item_id: "main-omelette", name: "Plain Omelette", qty: 1 }] },
      ],
    };
    expect(normalizeBreakfastRoom(room)).toEqual(room);
  });

  it("rejects a room whose plates exceed backend occupancy", () => {
    const room = { ezee_reservation_id: "reservation-404", room_number: "404", max_plates: 1, order_status: "PLACED", plates: [{}, {}] };
    expect(normalizeBreakfastRoom(room)).toBeNull();
  });

  it("keeps terminal link states minimal", () => {
    expect(normalizeBreakfastLookup({ link_state: "checked_out", brand: "BUTEAK" })).toEqual({ link_state: "checked_out", brand: "BUTEAK" });
  });

  it("accepts a backend menu with ten items", () => {
    const response = createBreakfastFixture();
    response.menu = Array.from({ length: 10 }, (_, index) => ({
      id: `menu-${index + 1}`,
      name: `Menu item ${index + 1}`,
      description: "Backend-managed item",
      category: index < 5 ? "MAIN" as const : index < 8 ? "ADDON" as const : "BEVERAGE" as const,
      is_veg: true,
      sort_order: index + 1,
    }));
    expect(normalizeBreakfastLookup(response)).toEqual(response);
  });
});
