import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { BreakfastOrderForm } from "@/components/breakfast/breakfast-order-form";
import { createBreakfastDraft, validateBreakfastDraft, type BreakfastDraft } from "@/lib/breakfast-order";
import { createBreakfastFixture } from "@/test/breakfast-fixture";

function Harness() {
  const response = createBreakfastFixture();
  response.rooms = [response.rooms[0]];
  response.total_adults = 2;
  const [draft, setDraft] = useState<BreakfastDraft>(() => createBreakfastDraft(response));
  const validation = validateBreakfastDraft(draft, response);
  return (
    <BreakfastOrderForm
      draft={draft}
      errors={{}}
      onReview={vi.fn()}
      onSkipRoom={vi.fn()}
      pending={false}
      remainingRequirements={Object.values(validation.errors)}
      response={response}
      setDraft={setDraft}
      validationErrors={validation.errors}
    />
  );
}

describe("BreakfastOrderForm", () => {
  it("uses native per-plate radios and disables full slots", async () => {
    render(<Harness />);
    expect(screen.getAllByRole("radio", { name: /Masala Dosa/i })).toHaveLength(2);
    expect(screen.getAllByRole("radio", { name: /8:00 - 8:30 AM/i }).every((item) => (item as HTMLInputElement).disabled)).toBe(true);
    expect(screen.getAllByText("Plate 2").length).toBeGreaterThan(0);
  });

  it("updates an optional quantity with labelled controls", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /Add one Fruit Bowl to Plate 1/i }));
    expect(screen.getByText("1", { selector: "output" })).not.toBeNull();
  });

  it("keeps Review Order disabled until every required choice is complete", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const reviewButton = screen.getByRole("button", { name: "Review Order" });
    expect((reviewButton as HTMLButtonElement).disabled).toBe(true);

    const mains = screen.getAllByRole("radio", { name: /Masala Dosa/i });
    const slots = screen.getAllByRole("radio", { name: /7:30 - 8:00 AM/i });
    await user.click(mains[0]);
    await user.click(mains[1]);
    await user.click(slots[0]);
    await user.click(slots[1]);

    expect((reviewButton as HTMLButtonElement).disabled).toBe(false);
  });

  it("reveals a required-field error only after that group is touched", () => {
    render(<Harness />);
    expect(screen.queryByText("Choose one main dish for Plate 1.", { selector: "p[role='alert']" })).toBeNull();

    fireEvent.blur(screen.getAllByRole("radio", { name: /Masala Dosa/i })[0], { relatedTarget: null });

    expect(screen.getByText("Choose one main dish for Plate 1.", { selector: "p[role='alert']" })).not.toBeNull();
  });
});
