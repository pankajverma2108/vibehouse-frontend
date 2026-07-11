import type { BreakfastValidResponse } from "@/lib/breakfast-api";

export function createBreakfastFixture(): BreakfastValidResponse {
  return {
    link_state: "valid",
    window: { state: "open", service_date: "2026-07-12", opens_at_ist: "2026-07-11 11:00 IST", closes_at_ist: "2026-07-12 07:00 IST" },
    brand: "BUTEAK",
    total_adults: 3,
    rooms: [
      { ezee_reservation_id: "reservation-404", room_number: "404", max_plates: 2, order_status: null, plates: [] },
      { ezee_reservation_id: "reservation-405", room_number: "405", max_plates: 1, order_status: null, plates: [] },
    ],
    menu: [
      { id: "main-dosa", name: "Masala Dosa", description: "Crisp dosa with sambar.", category: "MAIN", is_veg: true, sort_order: 1 },
      { id: "main-omelette", name: "Plain Omelette", description: "Two eggs with toast.", category: "MAIN", is_veg: false, sort_order: 2 },
      { id: "addon-fruit", name: "Fruit Bowl", description: "Seasonal fruit.", category: "ADDON", is_veg: true, sort_order: 1 },
      { id: "drink-coffee", name: "Filter Coffee", description: "Fresh filter coffee.", category: "BEVERAGE", is_veg: true, sort_order: 1 },
    ],
    slots: [
      { id: "slot-730", slot_number: 1, label: "7:30 - 8:00 AM", start_min: 450, end_min: 480, capacity: 12, booked: 8, remaining: 4, sort_order: 1 },
      { id: "slot-800", slot_number: 2, label: "8:00 - 8:30 AM", start_min: 480, end_min: 510, capacity: 12, booked: 12, remaining: 0, sort_order: 2 },
    ],
  };
}
