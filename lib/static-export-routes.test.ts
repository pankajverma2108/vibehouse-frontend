// @vitest-environment node

import { describe, expect, it } from "vitest";

import { requiresDocumentNavigation } from "@/lib/static-export-routes";

describe("requiresDocumentNavigation", () => {
  it.each([
    "/bookings/ERI-123/confirmed",
    "/bookings/ERI-123/web-check-in",
    "/breakfast/token-123",
    "/feedback/token-123",
    "/ERI-123/guest",
    "/ERI-123/guest/services#open",
  ])("requires a document request for %s", (href) => {
    expect(requiresDocumentNavigation(href)).toBe(true);
  });

  it.each([
    "/bookings",
    "/breakfast/preview",
    "/feedback/preview/valid",
    "/guest/services",
    "/property?property_id=60765",
  ])("keeps Next navigation for %s", (href) => {
    expect(requiresDocumentNavigation(href)).toBe(false);
  });
});
