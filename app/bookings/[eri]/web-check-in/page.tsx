import type { Metadata } from "next";

import { WebCheckInRoute } from "@/components/booking/web-check-in-route";
import { STATIC_ROUTE_SHELL_SEGMENT } from "@/lib/static-export-routes";

export const metadata: Metadata = {
  title: "Web Check-In",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return [{ eri: STATIC_ROUTE_SHELL_SEGMENT }];
}

export default function Page() {
  return <WebCheckInRoute />;
}
