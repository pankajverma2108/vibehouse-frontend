import { describe, expect, it } from "vitest";

import {
  BREAKFAST_TEST_TOKENS,
  getBreakfastTestScenario,
  getBreakfastTestScenarios,
  isBreakfastTestToken,
} from "@/lib/breakfast-preview";

describe("breakfast preview scenarios", () => {
  it("models one actual guest in a physically two-pax apartment as one Plate", () => {
    const scenario = getBreakfastTestScenario("test-OneGuestInTwoPaxRoom");

    expect(scenario.response.rooms).toHaveLength(1);
    expect(scenario.response.rooms[0].room_number).toContain("two-pax");
    expect(scenario.response.rooms[0].max_plates).toBe(1);
    expect(scenario.response.total_adults).toBe(1);
  });

  it("keeps the preview bypass limited to the exact scenario allowlist", () => {
    expect(getBreakfastTestScenarios().map((scenario) => scenario.token)).toEqual(BREAKFAST_TEST_TOKENS);
    expect(new Set(BREAKFAST_TEST_TOKENS).size).toBe(BREAKFAST_TEST_TOKENS.length);
    expect(isBreakfastTestToken("test-OneGuestInTwoPaxRoom")).toBe(true);
    expect(isBreakfastTestToken("test-OneGuestInTwoPaxRoom-extra")).toBe(false);
    expect(isBreakfastTestToken("test-anything-else")).toBe(false);
  });
});
