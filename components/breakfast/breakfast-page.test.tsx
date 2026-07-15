import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BreakfastPage, getBreakfastGreeting } from "@/components/breakfast/breakfast-page";
import { getPublicBreakfast, submitPublicBreakfast } from "@/lib/breakfast-api";
import { buildPreviewRooms } from "@/lib/breakfast-order";
import { getBreakfastTestScenario } from "@/lib/breakfast-preview";

vi.mock("@/lib/breakfast-api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/breakfast-api")>();
  return { ...original, getPublicBreakfast: vi.fn(), submitPublicBreakfast: vi.fn() };
});

async function completeSinglePlate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("radio", { name: /Idli and Vada/i }));
  await user.click(screen.getByRole("radio", { name: /07:30 - 08:00/i }));
}

describe("BreakfastPage review and confirmation flow", () => {
  beforeEach(() => {
    vi.mocked(getPublicBreakfast).mockReset();
    vi.mocked(submitPublicBreakfast).mockReset();
  });

  it("reviews and confirms a preview without calling either breakfast API", async () => {
    const user = userEvent.setup();
    render(
      <BreakfastPage
        initialLookup={getBreakfastTestScenario("test-TDSTwoRooms").response}
        previewLabel="Two rooms"
        simulateSubmit
        token="test-TDSTwoRooms"
      />,
    );

    const firstRoomMains = await screen.findAllByRole("radio", { name: /Masala Dosa/i });
    await user.click(firstRoomMains[0]);
    await user.click(firstRoomMains[1]);
    const firstRoomSlots = screen.getAllByRole("radio", { name: /07:30 - 08:00/i });
    await user.click(firstRoomSlots[0]);
    await user.click(firstRoomSlots[1]);
    await user.click(screen.getByRole("tab", { name: /Room 102 B/i }));
    await user.click(screen.getByRole("radio", { name: /Plain Omelette/i }));
    await user.click(screen.getAllByRole("radio", { name: /07:30 - 08:00/i })[0]);
    await user.click(screen.getByRole("button", { name: "Review Order" }));

    const reviewDialog = await screen.findByRole("dialog", { name: "Review Your Order" });
    expect(within(reviewDialog).getByText("Room 101 A")).not.toBeNull();
    expect(within(reviewDialog).getByText("Room 102 B")).not.toBeNull();
    expect(submitPublicBreakfast).not.toHaveBeenCalled();
    expect(getPublicBreakfast).not.toHaveBeenCalled();

    await user.click(within(reviewDialog).getByRole("button", { name: "Confirm Order" }));
    const placedDialog = await screen.findByRole("dialog", { name: "Order Placed" });
    expect(within(placedDialog).getByRole("button", { name: "Edit Order" })).not.toBeNull();
    expect(within(placedDialog).queryByRole("button", { name: "Confirm Order" })).toBeNull();
    expect(submitPublicBreakfast).not.toHaveBeenCalled();
    expect(getPublicBreakfast).not.toHaveBeenCalled();
  });

  it("does not POST until Confirm Order and then renders the backend receipt", async () => {
    const user = userEvent.setup();
    const response = getBreakfastTestScenario("test-OnePax").response;
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

    render(<BreakfastPage initialLookup={response} token="real-backend-token" />);
    await completeSinglePlate(user);
    await user.click(screen.getByRole("button", { name: "Review Order" }));

    const reviewDialog = await screen.findByRole("dialog", { name: "Review Your Order" });
    expect(submitPublicBreakfast).not.toHaveBeenCalled();
    await user.click(within(reviewDialog).getByRole("button", { name: "Confirm Order" }));

    expect(await screen.findByRole("dialog", { name: "Order Placed" })).not.toBeNull();
    expect(submitPublicBreakfast).toHaveBeenCalledTimes(1);
    expect(submitPublicBreakfast).toHaveBeenCalledWith("real-backend-token", payload);
  });

  it("keeps reviewed choices when Edit Order returns to the form", async () => {
    const user = userEvent.setup();
    const response = getBreakfastTestScenario("test-OnePax").response;
    render(<BreakfastPage initialLookup={response} token="real-backend-token" />);

    await completeSinglePlate(user);
    await user.click(screen.getByRole("button", { name: "Review Order" }));
    const reviewDialog = await screen.findByRole("dialog", { name: "Review Your Order" });
    await user.click(within(reviewDialog).getByRole("button", { name: "Edit Order" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Review Your Order" })).toBeNull());

    expect((screen.getByRole("radio", { name: /Idli and Vada/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: /07:30 - 08:00/i }) as HTMLInputElement).checked).toBe(true);
    expect(submitPublicBreakfast).not.toHaveBeenCalled();
  });

  it("keeps Review Order disabled and explains incomplete required choices", () => {
    render(
      <BreakfastPage
        initialLookup={getBreakfastTestScenario("test-OnePax").response}
        previewLabel="One guest"
        simulateSubmit
        token="test-OnePax"
      />,
    );

    expect((screen.getByRole("button", { name: "Review Order" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Finish each room to review your order.")).not.toBeNull();
    expect(submitPublicBreakfast).not.toHaveBeenCalled();
  });

  it("stages a room-specific skip and sends it only from Confirm Order", async () => {
    const user = userEvent.setup();
    const response = getBreakfastTestScenario("test-OnePax").response;
    const payload = {
      rooms: [{ ezee_reservation_id: "test-reservation-101", action: "SKIP" as const }],
    };
    vi.mocked(submitPublicBreakfast).mockResolvedValue({
      ok: true,
      status: 200,
      data: { ok: true, rooms: buildPreviewRooms(response, payload.rooms) },
    });

    render(<BreakfastPage initialLookup={response} token="real-backend-token" />);
    await user.click(screen.getByRole("button", { name: /Skip Breakfast for Room 101/i }));
    const skipDialog = await screen.findByRole("dialog", { name: "Skip Breakfast?" });
    await user.click(within(skipDialog).getByRole("button", { name: "Skip Breakfast" }));

    expect(submitPublicBreakfast).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Skip Breakfast?" })).toBeNull());
    await user.click(screen.getByRole("button", { name: "Review Order" }));
    const reviewDialog = await screen.findByRole("dialog", { name: "Review Your Order" });
    expect(within(reviewDialog).getByText("Breakfast will be skipped for this room.")).not.toBeNull();
    await user.click(within(reviewDialog).getByRole("button", { name: "Confirm Order" }));

    await waitFor(() => expect(submitPublicBreakfast).toHaveBeenCalledWith("real-backend-token", payload));
  });

  it("reconciles an ambiguous POST failure against the refreshed backend order", async () => {
    const user = userEvent.setup();
    const response = getBreakfastTestScenario("test-OnePax").response;
    const payload = {
      rooms: [{
        ezee_reservation_id: "test-reservation-101",
        action: "ORDER" as const,
        plates: [{ slot_id: "slot-730", items: [{ menu_item_id: "main-idli-vada", qty: 1 }] }],
      }],
    };
    const saved = { ...response, rooms: buildPreviewRooms(response, payload.rooms) };
    vi.mocked(submitPublicBreakfast).mockResolvedValue({
      ok: false,
      status: 0,
      data: null,
      message: "Connection lost",
      retryable: true,
    });
    vi.mocked(getPublicBreakfast).mockResolvedValue({ ok: true, status: 200, data: saved });

    render(<BreakfastPage initialLookup={response} token="real-backend-token" />);
    await completeSinglePlate(user);
    await user.click(screen.getByRole("button", { name: "Review Order" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Review Your Order" })).getByRole("button", { name: "Confirm Order" }));

    expect(await screen.findByRole("dialog", { name: "Order Placed" })).not.toBeNull();
    expect(getPublicBreakfast).toHaveBeenCalledWith("real-backend-token");
  });

  it("reconciles an incomplete 200 response before showing Order Placed", async () => {
    const user = userEvent.setup();
    const response = getBreakfastTestScenario("test-OnePax").response;
    const payload = {
      rooms: [{
        ezee_reservation_id: "test-reservation-101",
        action: "ORDER" as const,
        plates: [{ slot_id: "slot-730", items: [{ menu_item_id: "main-idli-vada", qty: 1 }] }],
      }],
    };
    const saved = { ...response, rooms: buildPreviewRooms(response, payload.rooms) };
    vi.mocked(submitPublicBreakfast).mockResolvedValue({ ok: true, status: 200, data: { ok: true, rooms: [] } });
    vi.mocked(getPublicBreakfast).mockResolvedValue({ ok: true, status: 200, data: saved });

    render(<BreakfastPage initialLookup={response} token="real-backend-token" />);
    await completeSinglePlate(user);
    await user.click(screen.getByRole("button", { name: "Review Order" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Review Your Order" })).getByRole("button", { name: "Confirm Order" }));

    expect(await screen.findByRole("dialog", { name: "Order Placed" })).not.toBeNull();
    expect(getPublicBreakfast).toHaveBeenCalledWith("real-backend-token");
  });

  it("does not reconcile a matching order from a different service date", async () => {
    const user = userEvent.setup();
    const response = getBreakfastTestScenario("test-OnePax").response;
    const payload = {
      rooms: [{
        ezee_reservation_id: "test-reservation-101",
        action: "ORDER" as const,
        plates: [{ slot_id: "slot-730", items: [{ menu_item_id: "main-idli-vada", qty: 1 }] }],
      }],
    };
    const saved = {
      ...response,
      window: { ...response.window, service_date: "2026-07-13" },
      rooms: buildPreviewRooms(response, payload.rooms),
    };
    vi.mocked(submitPublicBreakfast).mockResolvedValue({
      ok: false,
      status: 0,
      data: null,
      message: "Connection lost",
      retryable: true,
    });
    vi.mocked(getPublicBreakfast).mockResolvedValue({ ok: true, status: 200, data: saved });

    render(<BreakfastPage initialLookup={response} token="real-backend-token" />);
    await completeSinglePlate(user);
    await user.click(screen.getByRole("button", { name: "Review Order" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Review Your Order" })).getByRole("button", { name: "Confirm Order" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Review Your Order" })).toBeNull());
    expect(screen.queryByRole("dialog", { name: "Order Placed" })).toBeNull();
    expect(screen.getAllByText(/couldn't verify that the order was placed/i).length).toBeGreaterThan(0);
  });

  it("adopts a terminal lookup returned while recovering from slot_full", async () => {
    const user = userEvent.setup();
    const response = getBreakfastTestScenario("test-OnePax").response;
    vi.mocked(submitPublicBreakfast).mockResolvedValue({
      ok: false,
      status: 409,
      data: { ok: false, error: "slot_full", slots: response.slots },
      message: "Slot full",
      retryable: false,
    });
    vi.mocked(getPublicBreakfast).mockResolvedValue({
      ok: true,
      status: 200,
      data: { link_state: "checked_out", brand: "BUTEAK" },
    });

    render(<BreakfastPage initialLookup={response} token="real-backend-token" />);
    await completeSinglePlate(user);
    await user.click(screen.getByRole("button", { name: "Review Order" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Review Your Order" })).getByRole("button", { name: "Confirm Order" }));

    expect(await screen.findByRole("heading", { name: "Your stay has ended." })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Review Order" })).toBeNull();
  });

  it("shows an existing saved order with Edit Order and no confirm action", () => {
    render(<BreakfastPage initialLookup={getBreakfastTestScenario("test-ExistingOrder").response} token="test-ExistingOrder" />);
    expect(screen.getByRole("heading", { name: "Order Placed" })).not.toBeNull();
    expect(screen.getByText("07:30 - 08:00")).not.toBeNull();
    expect(screen.queryByText("Slot1")).toBeNull();
    expect(screen.getByRole("button", { name: "Edit Order" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Confirm Order" })).toBeNull();
  });

  it("does not expose an internal label when a saved slot is no longer returned", () => {
    const response = getBreakfastTestScenario("test-ExistingOrder").response;
    const missingSlotResponse = {
      ...response,
      slots: response.slots.filter((slot) => slot.id !== response.rooms[0].plates[0].slot_id),
      rooms: response.rooms.map((room, index) => index === 0
        ? { ...room, plates: room.plates.map((plate) => ({ ...plate, slot_label: "Slot1" })) }
        : room),
    };

    render(<BreakfastPage initialLookup={missingSlotResponse} token="test-ExistingOrder" />);

    expect(screen.getByText("Delivery time unavailable")).not.toBeNull();
    expect(screen.queryByText("Slot1")).toBeNull();
  });
});

describe("breakfast greeting", () => {
  it.each([
    ["2026-07-13T03:00:00.000Z", "GOOD MORNING"],
    ["2026-07-13T08:00:00.000Z", "GOOD AFTERNOON"],
    ["2026-07-13T15:00:00.000Z", "GOOD EVENING"],
  ])("uses India time when the page opens at %s", (timestamp, expected) => {
    expect(getBreakfastGreeting(new Date(timestamp))).toBe(expected);
  });
});
