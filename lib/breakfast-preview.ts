import type {
  BreakfastBrand,
  BreakfastMenuItem,
  BreakfastRoom,
  BreakfastSlot,
  BreakfastValidResponse,
} from "@/lib/breakfast-api";

export const BREAKFAST_TEST_TOKENS = [
  "test-OnePax",
  "test-TwoPaxOneRoom",
  "test-FourPaxOneRoom",
  "test-ThreeRooms",
  "test-ExistingOrder",
  "test-FrozenOrder",
  "test-AllSlotsFull",
  "test-TDSTwoRooms",
] as const;

export type BreakfastTestToken = (typeof BREAKFAST_TEST_TOKENS)[number];

export type BreakfastTestScenario = {
  token: BreakfastTestToken;
  label: string;
  description: string;
  response: BreakfastValidResponse;
};

const menu: BreakfastMenuItem[] = [
  { id: "main-idli-vada", name: "Idli and Vada", description: "Two soft idlis, one crisp vada, sambar and chutney.", category: "MAIN", is_veg: true, sort_order: 1 },
  { id: "main-puri-bhaji", name: "Puri Bhaji with Fruits", description: "Fluffy puris, homestyle potato bhaji and seasonal fruits.", category: "MAIN", is_veg: true, sort_order: 2 },
  { id: "main-masala-dosa", name: "Masala Dosa with Fruits", description: "Crisp dosa, spiced potato filling, sambar and seasonal fruits.", category: "MAIN", is_veg: true, sort_order: 3 },
  { id: "main-omelette", name: "Plain Omelette", description: "A two-egg omelette served with buttered toast.", category: "MAIN", is_veg: false, sort_order: 4 },
  { id: "addon-fruit-bowl", name: "Seasonal Fruit Bowl", description: "A fresh portion of cut fruit.", category: "ADDON", is_veg: true, sort_order: 1 },
  { id: "addon-buttered-toast", name: "Buttered Toast", description: "Two slices, lightly toasted.", category: "ADDON", is_veg: true, sort_order: 2 },
  { id: "beverage-tea", name: "Masala Tea", description: "Freshly brewed with milk and whole spices.", category: "BEVERAGE", is_veg: true, sort_order: 1 },
  { id: "beverage-coffee", name: "Filter Coffee", description: "South Indian filter coffee with milk.", category: "BEVERAGE", is_veg: true, sort_order: 2 },
];

const slots: BreakfastSlot[] = [
  { id: "slot-730", slot_number: 1, label: "7:30 - 8:00 AM", start_min: 450, end_min: 480, capacity: 12, booked: 8, remaining: 4, sort_order: 1 },
  { id: "slot-800", slot_number: 2, label: "8:00 - 8:30 AM", start_min: 480, end_min: 510, capacity: 12, booked: 11, remaining: 1, sort_order: 2 },
  { id: "slot-830", slot_number: 3, label: "8:30 - 9:00 AM", start_min: 510, end_min: 540, capacity: 12, booked: 9, remaining: 3, sort_order: 3 },
  { id: "slot-900", slot_number: 4, label: "9:00 - 9:30 AM", start_min: 540, end_min: 570, capacity: 12, booked: 12, remaining: 0, sort_order: 4 },
];

function room(roomNumber: string, maxPlates: number): BreakfastRoom {
  return { ezee_reservation_id: `test-reservation-${roomNumber}`, room_number: roomNumber, max_plates: maxPlates, order_status: null, plates: [] };
}

function response(rooms: BreakfastRoom[], brand: BreakfastBrand = "BUTEAK"): BreakfastValidResponse {
  return {
    link_state: "valid",
    window: { state: "open", service_date: "2026-07-12", opens_at_ist: "2026-07-11 11:00 IST", closes_at_ist: "2026-07-12 07:00 IST" },
    brand,
    total_adults: rooms.reduce((total, item) => total + item.max_plates, 0),
    rooms,
    menu,
    slots,
  };
}

const existingRoom: BreakfastRoom = {
  ...room("302", 2),
  order_status: "PLACED",
  plates: [
    { plate_number: 1, slot_id: "slot-730", slot_label: "7:30 - 8:00 AM", status: "PLACED", special_requests: "No onion", items: [{ menu_item_id: "main-idli-vada", name: "Idli and Vada", qty: 1 }, { menu_item_id: "beverage-tea", name: "Masala Tea", qty: 1 }] },
    { plate_number: 2, slot_id: "slot-830", slot_label: "8:30 - 9:00 AM", status: "PLACED", special_requests: null, items: [{ menu_item_id: "main-omelette", name: "Plain Omelette", qty: 1 }, { menu_item_id: "addon-fruit-bowl", name: "Seasonal Fruit Bowl", qty: 1 }] },
  ],
};

const scenarios: Record<BreakfastTestToken, BreakfastTestScenario> = {
  "test-OnePax": { token: "test-OnePax", label: "One guest · one room", description: "The simplest single-room breakfast order.", response: response([room("101", 1)]) },
  "test-TwoPaxOneRoom": { token: "test-TwoPaxOneRoom", label: "Two guests · one room", description: "Two separate plates within one room.", response: response([room("302", 2)]) },
  "test-FourPaxOneRoom": { token: "test-FourPaxOneRoom", label: "Four guests · one room", description: "High occupancy and repeated plate controls.", response: response([room("408", 4)]) },
  "test-ThreeRooms": { token: "test-ThreeRooms", label: "Three rooms · six guests", description: "One booker with three rooms; exercises the room selector and different occupancies.", response: response([room("201", 1), room("202", 2), room("203", 3)]) },
  "test-ExistingOrder": { token: "test-ExistingOrder", label: "Existing submitted order", description: "Two saved plates with independent slots and an Edit action.", response: response([existingRoom]) },
  "test-FrozenOrder": { token: "test-FrozenOrder", label: "Frozen read-only order", description: "A saved order rendered while the backend window is frozen.", response: { ...response([existingRoom]), window: { ...response([existingRoom]).window, state: "frozen", opens_at_ist: "2026-07-12 11:00 IST" } } },
  "test-AllSlotsFull": { token: "test-AllSlotsFull", label: "All delivery slots full", description: "Every backend slot reports zero remaining.", response: { ...response([room("305", 2)]), slots: slots.map((slot) => ({ ...slot, booked: slot.capacity, remaining: 0 })) } },
  "test-TDSTwoRooms": { token: "test-TDSTwoRooms", label: "TDS · two rooms", description: "The same workflow with The Daily Social branding and a room selector.", response: response([room("101 A", 2), room("102 B", 1)], "TDS") },
};

export function isBreakfastTestToken(value: string): value is BreakfastTestToken {
  return BREAKFAST_TEST_TOKENS.includes(value as BreakfastTestToken);
}

export function getBreakfastTestScenario(token: BreakfastTestToken) {
  return scenarios[token];
}

export function getBreakfastTestScenarios() {
  return BREAKFAST_TEST_TOKENS.map((token) => scenarios[token]);
}
