import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { BreakfastOrderForm } from "@/components/breakfast/breakfast-order-form";
import { createBreakfastDraft, type BreakfastDraft } from "@/lib/breakfast-order";
import { createBreakfastFixture } from "@/test/breakfast-fixture";

function Harness() {
  const response = createBreakfastFixture();
  response.rooms = [response.rooms[0]];
  response.total_adults = 2;
  const [draft, setDraft] = useState<BreakfastDraft>(() => createBreakfastDraft(response));
  return <BreakfastOrderForm draft={draft} errors={{}} onSkipRoom={vi.fn()} onSubmit={vi.fn()} pending={false} response={response} setDraft={setDraft} />;
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
});
