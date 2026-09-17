import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ScopedGuestLayout as ScopedGuestClientLayout } from "@/components/guest/scoped-guest-layout";
import { STATIC_ROUTE_SHELL_SEGMENT } from "@/lib/static-export-routes";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return [{ bookingId: STATIC_ROUTE_SHELL_SEGMENT }];
}

export default function Layout({ children }: { children: ReactNode }) {
  return <ScopedGuestClientLayout>{children}</ScopedGuestClientLayout>;
}
