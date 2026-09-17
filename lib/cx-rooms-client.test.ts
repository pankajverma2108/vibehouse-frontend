// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRoomAvailabilitySnapshot: vi.fn(),
  roomTypesToPropertyCategories: vi.fn(() => [{ roomTypeId: "room-1" }]),
}));

vi.mock("@/lib/cx-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cx-api")>()),
  getRoomAvailabilitySnapshot: mocks.getRoomAvailabilitySnapshot,
  roomTypesToPropertyCategories: mocks.roomTypesToPropertyCategories,
}));

import { loadCxRooms } from "@/lib/cx-rooms-client";

describe("loadCxRooms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRoomAvailabilitySnapshot.mockResolvedValue({
      propertyId: "60765",
      checkin: "2026-08-11",
      checkout: "2026-08-12",
      mode: "availability",
      availabilitySource: "ezee_live",
      hasLiveAvailability: true,
      availabilityError: null,
      roomTypes: [{ id: "room-1" }],
    });
  });

  it.each([
    [{ propertyId: "" }, "missing_property_id"],
    [{ propertyId: "abc" }, "invalid_property_id"],
    [{ propertyId: "60765", checkin: "2026-08-11" }, "invalid_date_range"],
    [{ propertyId: "60765", checkin: "11-08-2026", checkout: "2026-08-12" }, "invalid_checkin"],
    [{ propertyId: "60765", checkin: "2026-08-11", checkout: "12-08-2026" }, "invalid_checkout"],
    [{ propertyId: "60765", checkin: "2026-08-12", checkout: "2026-08-11" }, "invalid_date_window"],
  ])("rejects invalid input with %s", async (options, code) => {
    await expect(loadCxRooms(options)).rejects.toMatchObject({ code });
    expect(mocks.getRoomAvailabilitySnapshot).not.toHaveBeenCalled();
  });

  it("preserves the existing client payload shape", async () => {
    const controller = new AbortController();
    const payload = await loadCxRooms({
      propertyId: "60765",
      checkin: "2026-08-11",
      checkout: "2026-08-12",
      signal: controller.signal,
    });

    expect(mocks.getRoomAvailabilitySnapshot).toHaveBeenCalledWith({
      propertyId: "60765",
      checkin: "2026-08-11",
      checkout: "2026-08-12",
      signal: controller.signal,
    });
    expect(payload).toMatchObject({
      property_id: "60765",
      mode: "availability",
      availability_source: "ezee_live",
      has_live_availability: true,
      availability_error: null,
      categories: [{ roomTypeId: "room-1" }],
    });
  });
});
