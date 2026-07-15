import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BreakfastConfirmationDialog } from "@/components/breakfast/breakfast-confirmation-dialog";
import { buildBreakfastOrderReview } from "@/lib/breakfast-order";
import { createBreakfastFixture } from "@/test/breakfast-fixture";

function createReview() {
  const response = createBreakfastFixture();
  return {
    response,
    review: buildBreakfastOrderReview(response, {
      rooms: [
        {
          ezee_reservation_id: "reservation-404",
          action: "ORDER",
          plates: [{ slot_id: "slot-730", items: [{ menu_item_id: "main-dosa", qty: 1 }] }],
        },
        { ezee_reservation_id: "reservation-405", action: "SKIP" },
      ],
    }),
  };
}

describe("BreakfastConfirmationDialog", () => {
  it("shows an unsaved receipt with Edit Order and Confirm Order actions", () => {
    const { response, review } = createReview();
    render(
      <BreakfastConfirmationDialog
        canEdit
        mode="review"
        onConfirm={vi.fn()}
        onEdit={vi.fn()}
        onOpenChange={vi.fn()}
        open
        pending={false}
        review={review}
        serviceDate={response.window.service_date}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Review Your Order" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Edit Order" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Confirm Order" })).not.toBeNull();
    expect(screen.getByText("07:30 - 08:00")).not.toBeNull();
    expect(screen.getByText("Breakfast will be skipped for this room.")).not.toBeNull();
  });

  it("shows only Edit Order after placement and keeps the X close control", () => {
    const { response, review } = createReview();
    render(
      <BreakfastConfirmationDialog
        canEdit
        mode="placed"
        onEdit={vi.fn()}
        onOpenChange={vi.fn()}
        open
        pending={false}
        review={review}
        serviceDate={response.window.service_date}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Order Placed" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Confirm Order" })).toBeNull();
    expect(screen.getByRole("button", { name: "Edit Order" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Close order receipt" })).not.toBeNull();
  });

  it("locks the review dialog while the order is being placed", () => {
    const { response, review } = createReview();
    render(
      <BreakfastConfirmationDialog
        canEdit
        mode="review"
        onConfirm={vi.fn()}
        onEdit={vi.fn()}
        onOpenChange={vi.fn()}
        open
        pending
        review={review}
        serviceDate={response.window.service_date}
      />,
    );

    expect(screen.getByRole("button", { name: "Placing order..." })).not.toBeNull();
    expect((screen.getByRole("button", { name: "Close order receipt" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
