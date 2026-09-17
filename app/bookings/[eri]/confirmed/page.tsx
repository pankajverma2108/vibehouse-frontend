import type { Metadata } from "next";

import { BookingConfirmedRoute } from "@/components/booking/booking-confirmed-route";
import { STATIC_ROUTE_SHELL_SEGMENT } from "@/lib/static-export-routes";

export const metadata: Metadata = {
  title: "Booking Confirmed",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return [{ eri: STATIC_ROUTE_SHELL_SEGMENT }];
}

export default function Page() {
  return <BookingConfirmedRoute />;
}
