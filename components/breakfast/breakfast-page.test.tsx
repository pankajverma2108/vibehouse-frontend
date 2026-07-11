import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BreakfastPage } from "@/components/breakfast/breakfast-page";
import { getPublicBreakfast, submitPublicBreakfast } from "@/lib/breakfast-api";
import { getBreakfastTestScenario } from "@/lib/breakfast-preview";
import { buildPreviewRooms } from "@/lib/breakfast-order";

vi.mock("@/lib/breakfast-api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/breakfast-api")>();
  return { ...original, getPublicBreakfast: vi.fn(), submitPublicBreakfast: vi.fn() };
});

describe("BreakfastPage backend preview flow", () => {
  beforeEach(() => {
    vi.mocked(getPublicBreakfast).mockClear();
    vi.mocked(submitPublicBreakfast).mockClear();
  });

  it("GETs backend data but simulates submit and opens confirmation", async () => {
    const user = userEvent.setup();
    render(<BreakfastPage initialLookup={getBreakfastTestScenario("test-TDSTwoRooms").response} previewLabel="Two rooms" simulateSubmit token="test-TDSTwoRooms" />);
    const firstRoomMains = await screen.findAllByRole("radio", { name: /Masala Dosa/i });
    await user.click(firstRoomMains[0]);
    await user.click(firstRoomMains[1]);
    const firstRoomSlots = screen.getAllByRole("radio", { name: /7:30 - 8:00 AM/i });
    await user.click(firstRoomSlots[0]);
    await user.click(firstRoomSlots[1]);
    await user.click(screen.getByRole("tab", { name: /Room 102 B/i }));
    await user.click(screen.getByRole("radio", { name: /Plain Omelette/i }));
    await user.click(screen.getAllByRole("radio", { name: /7:30 - 8:00 AM/i })[0]);
    await user.click(screen.getByRole("button", { name: /Submit order/i }));
    expect(await screen.findByRole("dialog", { name: /Order submitted/i })).not.toBeNull();
    expect(submitPublicBreakfast).not.toHaveBeenCalled();
    expect(getPublicBreakfast).not.toHaveBeenCalled();
  });

  it("POSTs a real-token order and opens confirmation from the backend response", async () => {
    const user = userEvent.setup();
    const response = getBreakfastTestScenario("test-OnePax").response;
    vi.mocked(getPublicBreakfast).mockResolvedValue({ ok: true, status: 200, data: response });
    const payload = {
      rooms: [{
        ezee_reservation_id: "test-reservation-101",
        action: "ORDER" as const,
        plates: [{ slot_id: "slot-730", items: [{ menu_item_id: "main-idli-vada", qty: 1 }] }],
      }],
    };
    vi.mocked(submitPublicBreakfast).mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, rooms: buildPreviewRooms(response, payload.rooms) },
    });

    render(<BreakfastPage token="real-backend-token" />);
    await user.click(await screen.findByRole("radio", { name: /Idli and Vada/i }));
    await user.click(screen.getByRole("radio", { name: /7:30 - 8:00 AM/i }));
    await user.click(screen.getByRole("button", { name: /Submit order/i }));

    expect(await screen.findByRole("dialog", { name: /Order submitted/i })).not.toBeNull();
    expect(submitPublicBreakfast).toHaveBeenCalledWith("real-backend-token", payload);
  });

  it("moves focus to the first plate error when Submit is incomplete", async () => {
    const user = userEvent.setup();
    render(<BreakfastPage initialLookup={getBreakfastTestScenario("test-OnePax").response} previewLabel="One guest" simulateSubmit token="test-OnePax" />);

    await user.click(screen.getByRole("button", { name: /Submit order/i }));

    const error = await screen.findByText("Choose one main dish for Plate 1.");
    expect(document.activeElement).toBe(error);
    expect(submitPublicBreakfast).not.toHaveBeenCalled();
  });
});
