import type { Metadata } from "next";

import { UpcomingPage } from "@/components/standalone/upcoming-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Upcoming Hubs",
  description: "Upcoming The Daily Social hubs in Koramangala.",
};

export default function Page() {
  return <UpcomingPage />;
}
