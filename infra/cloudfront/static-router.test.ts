// @vitest-environment node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

type CloudFrontRequest = {
  method: string;
  querystring: Record<string, unknown>;
  uri: string;
};

type CloudFrontResponse = {
  headers?: Record<string, { value: string }>;
  statusCode: number;
};

const source = fs.readFileSync(path.join(process.cwd(), "infra", "cloudfront", "static-router.js"), "utf8");
const context = vm.createContext({});
vm.runInContext(`${source}\nthis.routeRequest = handler;`, context);
const routeRequest = context.routeRequest as (event: { request: CloudFrontRequest }) => CloudFrontRequest | CloudFrontResponse;

function request(uri: string, method = "GET") {
  return routeRequest({ request: { method, querystring: {}, uri } });
}

describe("CloudFront static router", () => {
  it.each([
    ["/", "/index.html"],
    ["/about", "/about.html"],
    ["/auth/google/success", "/auth/google/success.html"],
    ["/bookings/ERI-123/confirmed", "/bookings/__static_shell__/confirmed.html"],
    ["/bookings/ERI-123/web-check-in", "/bookings/__static_shell__/web-check-in.html"],
    ["/breakfast/token-123", "/breakfast/__static_shell__.html"],
    ["/feedback/token-123", "/feedback/__static_shell__.html"],
    ["/ERI-123/guest", "/__static_shell__/guest.html"],
    ["/ERI-123/guest/services", "/__static_shell__/guest/services.html"],
    ["/feedback/preview/valid", "/feedback/preview/valid.html"],
    ["/about/__next.about.__PAGE__.txt", "/about/__next.about/__PAGE__.txt"],
    [
      "/auth/google/success/__next.auth.google.success.__PAGE__.txt",
      "/auth/google/success/__next.auth/google/success/__PAGE__.txt",
    ],
  ])("maps %s to %s", (viewerUri, originUri) => {
    expect(request(viewerUri)).toMatchObject({ uri: originUri });
  });

  it.each([
    ["/launching-soon", "/upcoming", 307],
    ["/reviewnew", "/bookingreview", 307],
    ["/bookings/ERI-123/pre-arrival", "/bookings/ERI-123/web-check-in", 307],
    ["/ERI-123/guest/borrow", "/ERI-123/guest/addons#rentals", 307],
    ["/ERI-123/guest/extend", "/ERI-123/guest/addons#upgrades", 307],
    ["/ERI-123/guest/lost-found", "/ERI-123/guest#lost-found", 307],
    ["/policies/privacy", "/policies#privacy-policy", 308],
    ["/about/", "/about", 308],
  ])("redirects %s to %s", (viewerUri, location, statusCode) => {
    expect(request(viewerUri)).toMatchObject({
      headers: { location: { value: location } },
      statusCode,
    });
  });

  it.each(["/_next/static/chunk.js", "/favicon.ico", "/api/health", "/.well-known/security.txt"])(
    "passes through %s",
    (uri) => expect(request(uri)).toMatchObject({ uri }),
  );

  it("does not rewrite non-document methods", () => {
    expect(request("/about", "POST")).toMatchObject({ method: "POST", uri: "/about" });
  });

  it("does not expose reserved shell URLs", () => {
    expect(request("/bookings/__static_shell__/confirmed")).toMatchObject({ statusCode: 404 });
  });
});
