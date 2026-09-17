import type { Metadata } from "next";

import { BreakfastRoute } from "@/components/breakfast/breakfast-route";
import { STATIC_ROUTE_SHELL_SEGMENT } from "@/lib/static-export-routes";

export const metadata: Metadata = {
  title: "Breakfast Menu",
  description: "Choose breakfast for your stay.",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return [{ token: STATIC_ROUTE_SHELL_SEGMENT }];
}

export default function Page() {
  return <BreakfastRoute />;
}
